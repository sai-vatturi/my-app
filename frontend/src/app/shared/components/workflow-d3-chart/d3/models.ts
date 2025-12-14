export interface WorkflowNode {
    id: string;
    label: string;
    type: 'release' | 'product' | 'stage';
    status?: 'completed' | 'current' | 'upcoming';
    deadline?: string;
    children?: WorkflowNode[];
    // Extended properties for logic
    productId?: string;
    stageOrder?: number;
    requiresAttachment?: boolean;
    attachmentMandatory?: boolean;
    hasAttachment?: boolean;
}

export interface StageClickEvent {
    productId: string;
    stageOrder: number;
    event: MouseEvent;
    element: HTMLElement;
}

