export interface ILaneColumn {
  name: string;
  key: string;
  width?: number;
}
export interface IKanbanBoardProps {
  laneColumns: ILaneColumn[];
  onRenderLaneItem?: (item?: any, index?: number) => any;
  onRenderLaneColumn?: (laneColumn: ILaneColumn) => any;
  items?: any[];
  getMoreLaneItems?: (laneColumn: ILaneColumn) => any[];
  getLaneItems?: (laneColumn: ILaneColumn, items?: any[]) => any[] | undefined;
}
export interface IKanbanLaneProps {
  laneColumn: ILaneColumn;
  onRenderLaneItem?: (item?: any, index?: number) => any;
  onRenderLaneColumn?: (laneColumn: ILaneColumn) => any;
  items?: any[];
  getMoreLaneItems?: (laneColumn: ILaneColumn) => any[];
}
export interface IKanbanLaneState {
  items: any[];
}

export interface IKanbanLaneItemProps {
  onRenderLaneItem?: (item?: any, index?: number) => any;
  item: any;
  index: any;
  connectDragSource?: any;
  connectDropTarget?: any;
  connectDragPreview?: any;
  deleteItem: (index: any) => any;
  addItem: (index: any, item: any) => void;
  moveItem: (sourceIndex: any, destinationIndex: any) => void;
  isDragging?: boolean;
  parentLaneKey: string;
}
