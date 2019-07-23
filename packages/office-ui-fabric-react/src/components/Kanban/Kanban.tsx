import * as React from 'react';
import { IKanbanProps, ILaneColumn } from './Kanban.types';
import { mergeStyleSets } from 'office-ui-fabric-react/lib/Styling';
import { List } from 'office-ui-fabric-react/lib/List';

const classNames = mergeStyleSets({
  kanbanContainer: {
    display: 'flex',
    direction: 'column'
  },
  kanbanLaneColumn: {
    position: 'relative',
    backgroundColor: 'azure',
    top: 0
  },
  kanbanLaneItem: {}
});

export class Kanban extends React.PureComponent<IKanbanProps> {
  constructor(props: IKanbanProps) {
    super(props);
  }
  public render(): JSX.Element {
    const { laneColumns, items } = this.props;
    return (
      <div className={classNames.kanbanContainer}>
        {laneColumns.map((element, i) => (
          <KanbanLane key={`column#${i}`} {...this.props} items={items.filter(item => item.status === element.name)} laneColumn={element} />
        ))}
      </div>
    );
  }
}

interface IKanbanLane {
  laneColumn: ILaneColumn;
  items: any[];
  onRenderLaneItem?: (item?: any, index?: number) => any;
  getItems?: (laneColumn: ILaneColumn) => any[];
}
class KanbanLane extends React.PureComponent<IKanbanLane> {
  constructor(props: IKanbanLane) {
    super(props);
  }
  public render(): JSX.Element {
    return (
      <div style={{ border: '1px solid', margin: 20 }}>
        <div className={classNames.kanbanLaneColumn}>{'---===---' + this.props.laneColumn.name + '---===---'}</div>
        <List items={this.props.items} onRenderCell={this._onRenderLaneItem} />
      </div>
    );
  }
  private _onRenderLaneItem = (item?: any, index?: number) => {
    return <div>{this.props.onRenderLaneItem && this.props.onRenderLaneItem(item, index)}</div>;
  };
}
