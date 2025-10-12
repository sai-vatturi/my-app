"""Lightweight in-memory database utilities used by the API services.

The original project expected a running MongoDB instance via Motor.  For the
purposes of the kata we replace it with a deterministic in-memory store that
exposes a Mongo-like API.  This keeps the service layer logic intact while
allowing the FastAPI application to run in the test environment without any
external dependencies.
"""

from __future__ import annotations

import copy
import os
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional

from bson import ObjectId

from app.core.config import settings


class InsertOneResult:
    def __init__(self, inserted_id: str) -> None:
        self.inserted_id = inserted_id


class UpdateResult:
    def __init__(self, matched_count: int, modified_count: int) -> None:
        self.matched_count = matched_count
        self.modified_count = modified_count


class DeleteResult:
    def __init__(self, deleted_count: int) -> None:
        self.deleted_count = deleted_count


class InMemoryCursor:
    """A minimal async cursor that mimics Motor's behaviour for find()."""

    def __init__(self, documents: Iterable[Dict[str, Any]]) -> None:
        self._documents = list(documents)
        self._skip = 0
        self._limit: Optional[int] = None
        self._prepared: Optional[List[Dict[str, Any]]] = None
        self._index = 0

    def _prepare(self) -> List[Dict[str, Any]]:
        if self._prepared is None:
            docs = self._documents[self._skip :]
            if self._limit is not None:
                docs = docs[: self._limit]
            # store deep copies so callers cannot mutate internal state
            self._prepared = [copy.deepcopy(doc) for doc in docs]
        return self._prepared

    def skip(self, count: int) -> "InMemoryCursor":
        self._skip = max(count, 0)
        return self

    def limit(self, count: int) -> "InMemoryCursor":
        self._limit = max(count, 0)
        return self

    def __aiter__(self) -> "InMemoryCursor":
        self._index = 0
        return self

    async def __anext__(self) -> Dict[str, Any]:
        docs = self._prepare()
        if self._index >= len(docs):
            raise StopAsyncIteration
        document = docs[self._index]
        self._index += 1
        return document


class InMemoryCollection:
    def __init__(self) -> None:
        self._documents: List[Dict[str, Any]] = []

    @staticmethod
    def _normalise(value: Any) -> Any:
        if isinstance(value, ObjectId):
            return str(value)
        return value

    def _match(self, document: Dict[str, Any], filter_: Dict[str, Any]) -> bool:
        for key, expected in filter_.items():
            actual = document.get(key)
            if self._normalise(actual) != self._normalise(expected):
                return False
        return True

    async def find_one(self, filter_: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        filter_ = filter_ or {}
        for document in self._documents:
            if self._match(document, filter_):
                return copy.deepcopy(document)
        return None

    def find(self, filter_: Optional[Dict[str, Any]] = None) -> InMemoryCursor:
        filter_ = filter_ or {}
        matched = (doc for doc in self._documents if self._match(doc, filter_))
        return InMemoryCursor(copy.deepcopy(doc) for doc in matched)

    async def insert_one(self, document: Dict[str, Any]) -> InsertOneResult:
        stored = copy.deepcopy(document)
        identifier = stored.get("_id", ObjectId())
        stored["_id"] = str(identifier)
        self._documents.append(stored)
        return InsertOneResult(inserted_id=stored["_id"])

    async def update_one(self, filter_: Dict[str, Any], update: Dict[str, Any]) -> UpdateResult:
        matched = 0
        modified = 0
        for document in self._documents:
            if self._match(document, filter_):
                matched += 1
                if "$set" in update:
                    for key, value in update["$set"].items():
                        document[key] = copy.deepcopy(value)
                    modified += 1
                break
        return UpdateResult(matched_count=matched, modified_count=modified)

    async def delete_one(self, filter_: Dict[str, Any]) -> DeleteResult:
        for index, document in enumerate(self._documents):
            if self._match(document, filter_):
                del self._documents[index]
                return DeleteResult(deleted_count=1)
        return DeleteResult(deleted_count=0)


class InMemoryDatabase:
    def __init__(self) -> None:
        self._collections: Dict[str, InMemoryCollection] = {}

    def __getattr__(self, name: str) -> InMemoryCollection:
        return self.get_collection(name)

    def get_collection(self, name: str) -> InMemoryCollection:
        if name not in self._collections:
            self._collections[name] = InMemoryCollection()
        return self._collections[name]


class InMemoryClient:
    def __init__(self) -> None:
        self._databases: Dict[str, InMemoryDatabase] = {}

    def __getitem__(self, name: str) -> InMemoryDatabase:
        if name not in self._databases:
            self._databases[name] = InMemoryDatabase()
        return self._databases[name]

    def close(self) -> None:
        self._databases.clear()


@dataclass
class Database:
    client: Optional[InMemoryClient] = None
    database: Optional[InMemoryDatabase] = None


db = Database()


async def get_database() -> InMemoryDatabase:
    if db.database is None:
        await connect_to_mongo()
    assert db.database is not None  # for type checkers
    return db.database


async def connect_to_mongo() -> None:
    """Initialise the in-memory database."""

    db.client = InMemoryClient()
    db.database = db.client[settings.DATABASE_NAME]

    # Create uploads directory if it doesn't exist
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


async def close_mongo_connection() -> None:
    """Close database connection"""

    if db.client:
        db.client.close()
    db.client = None
    db.database = None
