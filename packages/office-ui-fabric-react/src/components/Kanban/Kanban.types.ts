export interface ILaneColumn {
  name: string;
  key: string;
  width?: number;
}
export interface IKanbanProps {
  laneColumns: ILaneColumn[];
  items: any[];
  onRenderLaneItem?: (item?: any, index?: number) => any;
  getItems?: (laneColumn: ILaneColumn) => any[];
}
