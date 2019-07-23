export interface ILaneColumn {
  name: string;
  key: string;
  width?: number;
}
export interface IKanbanBoardProps {
  laneColumns: ILaneColumn[];
  onRenderLaneItem?: (item?: any, index?: number) => any;
  onRenderLaneColumn?: (laneColumn: ILaneColumn) => any;
  getItems?: (laneColumn: ILaneColumn) => any[];
}
export interface IKanbanLaneProps {
  laneColumn: ILaneColumn;
  onRenderLaneItem?: (item?: any, index?: number) => any;
  onRenderLaneColumn?: (laneColumn: ILaneColumn) => any;
  getItems?: (laneColumn: ILaneColumn) => any[];
}
export interface IKanbanLaneState {
  items: any[];
}
