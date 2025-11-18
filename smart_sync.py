#!/usr/bin/env python3
"""
smart_sync.py

Copy files from source_dir into dest_dir (a git working tree) but avoid touching files
that are effectively identical after normalization (encoding/BOM and line ending normalization).
This reduces spurious git diffs like "file deleted" + "file added" when lines are actually the same.

Usage:
    python smart_sync.py SOURCE_DIR DEST_DIR [--dry-run] [--verbose] [--include-glob GLOB] [--exclude-glob GLOB]

"""
from __future__ import annotations
import argparse
import os
import sys
import shutil
import tempfile
from pathlib import Path
from typing import Optional, Tuple

TEXT_EXTENSIONS = {
    # common code / text file extensions. We will still attempt to normalize decoding on others,
    # but having an extension hint helps decisions (not strictly necessary).
    ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".c", ".cpp", ".h", ".hpp",
    ".md", ".txt", ".rst", ".json", ".yaml", ".yml", ".html", ".css", ".env",
    ".cfg", ".ini", ".sql", ".bat", ".sh", ".gradle", ".properties"
}

def is_textish(path: Path) -> bool:
    # simple heuristic: by extension if present, else attempt to decode a small sample
    if path.suffix.lower() in TEXT_EXTENSIONS:
        return True
    try:
        with path.open("rb") as f:
            sample = f.read(2048)
        # If null bytes present it's likely binary
        if b"\x00" in sample:
            return False
        # else assume text
        return True
    except Exception:
        return False

def decode_bytes_try(buf: bytes) -> Tuple[str, str]:
    """
    Try decoding bytes to str. Return (decoded_text, used_encoding_label).
    We try 'utf-8-sig' first (handles BOM), then 'utf-8', then 'latin-1' fallback.
    """
    for enc in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            return buf.decode(enc), enc
        except Exception:
            continue
    # worst-case
    return buf.decode("latin-1", errors="replace"), "latin-1-replace"

def normalize_text(text: str) -> str:
    # Normalize line endings to LF (git canonicalization usually LF internally)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # (OPTIONAL) don't change trailing whitespace by default; user may modify if wanted.
    return text

def read_normalized(path: Path) -> Tuple[Optional[str], Optional[str]]:
    """
    Return tuple (normalized_text_or_None_if_binary, encoding_hint).
    If file looks binary, return (None, None) and caller should handle binary comparison.
    """
    try:
        raw = path.read_bytes()
    except Exception as e:
        raise RuntimeError(f"Failed to read {path}: {e}")
    # Heuristic for text vs binary:
    if b"\x00" in raw:
        return None, None
    text, enc = decode_bytes_try(raw)
    text = normalize_text(text)
    return text, enc

def files_are_equivalent(src: Path, dst: Path) -> bool:
    """
    Determine if source and destination are equivalent after normalization.
    Returns True if no change is needed.
    """
    if not dst.exists():
        return False
    # If both are symlinks, compare link targets
    if src.is_symlink() or dst.is_symlink():
        try:
            if src.is_symlink() and dst.is_symlink():
                return os.readlink(src) == os.readlink(dst)
            # else not the same -> not equivalent
            return False
        except Exception:
            return False

    # Try normalized text comparison
    src_text, src_enc = read_normalized(src)
    dst_text, dst_enc = read_normalized(dst)
    if src_text is not None and dst_text is not None:
        return src_text == dst_text

    # If either is binary (contains NUL), do a raw bytes compare
    try:
        return src.read_bytes() == dst.read_bytes()
    except Exception:
        return False

def copy_preserve_meta_atomic(src: Path, dst: Path, preserve_mode=True, preserve_times=True):
    """
    Copy src -> dst by writing to a temp file in dst's directory and os.replace (atomic).
    Optionally preserve dst's existing file mode and timestamps (if dst existed), else preserve src's.
    """
    dst_dir = dst.parent
    dst_dir.mkdir(parents=True, exist_ok=True)
    # pre-read mode/times to preserve destination's permission/times if it exists
    dst_exists = dst.exists()
    dst_stat = dst.stat() if dst_exists else None
    src_stat = src.stat() if src.exists() else None

    if src.is_symlink():
        # replicate symlink (remove existing dst if present)
        if dst.exists() or dst.is_symlink():
            dst.unlink()
        target = os.readlink(src)
        os.symlink(target, dst)
        return

    # write to temp file in same dir to allow atomic replace
    with tempfile.NamedTemporaryFile(dir=str(dst_dir), delete=False) as tf:
        tmp_path = Path(tf.name)
        # copy content in binary mode
        with src.open("rb") as s:
            shutil.copyfileobj(s, tf)
    # preserve permissions: choose destination's existing mode if requested and it exists,
    # otherwise use source file's mode
    try:
        if preserve_mode and dst_stat is not None:
            os.chmod(tmp_path, dst_stat.st_mode)
        elif src_stat is not None:
            os.chmod(tmp_path, src_stat.st_mode)
    except Exception:
        pass

    # atomic replace
    os.replace(str(tmp_path), str(dst))

    # preserve times: if destination existed and requested, restore its times; else copy src times
    try:
        if preserve_times and dst_stat is not None:
            os.utime(dst, (dst_stat.st_atime, dst_stat.st_mtime))
        elif src_stat is not None:
            os.utime(dst, (src_stat.st_atime, src_stat.st_mtime))
    except Exception:
        pass

def should_exclude(path: Path, exclude_globs: list[str]) -> bool:
    for g in exclude_globs:
        if path.match(g):
            return True
    return False

def should_include(path: Path, include_globs: list[str]) -> bool:
    if not include_globs:
        return True
    for g in include_globs:
        if path.match(g):
            return True
    return False

def sync_dirs(src_root: Path, dst_root: Path, dry_run=False, verbose=False,
              include_globs: list[str]=[], exclude_globs: list[str]=[]):
    src_root = src_root.resolve()
    dst_root = dst_root.resolve()

    if not src_root.is_dir():
        raise SystemExit(f"Source {src_root} is not a directory")
    if not dst_root.exists():
        raise SystemExit(f"Destination {dst_root} does not exist (it should be the git working tree root)")

    # Walk source tree
    for src_path in src_root.rglob("*"):
        rel = src_path.relative_to(src_root)
        dst_path = dst_root.joinpath(rel)

        # Skip .git inside destination path in case someone points into a git repo subdir
        if ".git" in rel.parts:
            if verbose:
                print(f"Skipping .git path: {rel}")
            continue

        if should_exclude(rel, exclude_globs):
            if verbose:
                print(f"Excluded: {rel}")
            continue
        if not should_include(rel, include_globs):
            if verbose:
                print(f"Not included by include_globs: {rel}")
            continue

        if src_path.is_dir():
            # ensure directory exists
            if not dst_path.exists() and not dry_run:
                dst_path.mkdir(parents=True, exist_ok=True)
            elif verbose:
                print(f"Ensure dir: {dst_path}")
            continue

        # For files and symlinks:
        try:
            equivalent = files_are_equivalent(src_path, dst_path)
        except Exception as e:
            print(f"Warning: comparing {src_path} -> {dst_path} failed: {e}", file=sys.stderr)
            equivalent = False

        if equivalent:
            if verbose:
                print(f"UNCHANGED: {rel}")
            continue

        action = "DRY_COPY" if dry_run else "COPY"
        if verbose:
            print(f"{action}: {rel}")

        if not dry_run:
            # If destination exists and is a file or symlink, keep metadata as described
            try:
                copy_preserve_meta_atomic(src_path, dst_path, preserve_mode=True, preserve_times=True)
            except Exception as e:
                print(f"Error copying {src_path} -> {dst_path}: {e}", file=sys.stderr)

    # Also note: this script does NOT delete files from destination that are absent in source.
    # If you want mirror/delete behavior, implement carefully (and consider safety).
    if verbose:
        print("Sync complete.")

def parse_args():
    p = argparse.ArgumentParser(description="Smart sync from a source folder into a destination git working tree.\n"
                                            "Only writes files that actually differ after normalization (encoding/BOM, CRLF/LF).")
    p.add_argument("source", type=Path, help="Source directory (non-git repo copy)")
    p.add_argument("dest", type=Path, help="Destination directory (git working tree root)")
    p.add_argument("--dry-run", action="store_true", help="Show what would be changed without writing files")
    p.add_argument("--verbose", "-v", action="store_true", help="Verbose logging")
    p.add_argument("--include-glob", action="append", default=[], help="Only include paths matching this glob (can repeat). Glob is relative, e.g. '*.py' or 'src/**'")
    p.add_argument("--exclude-glob", action="append", default=[], help="Exclude paths matching this glob (can repeat).")
    return p.parse_args()

def main():
    args = parse_args()
    try:
        sync_dirs(args.source, args.dest, dry_run=args.dry_run, verbose=args.verbose,
                  include_globs=args.include_glob, exclude_globs=args.exclude_glob)
    except Exception as e:
        print(f"Fatal: {e}", file=sys.stderr)
        sys.exit(2)

if __name__ == "__main__":
    main()