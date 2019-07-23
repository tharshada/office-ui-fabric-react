import * as React from 'react';
import { IKanbanBoardProps, IKanbanLaneProps, ILaneColumn, IKanbanLaneState } from './KanbanBoard.types';
import { mergeStyleSets } from 'office-ui-fabric-react/lib/Styling';
import { List } from 'office-ui-fabric-react/lib/List';
import { DefaultButton } from '../Button';

const classNames = mergeStyleSets({
  kanbanContainer: {
    display: 'flex',
    direction: 'column',
    overflowY: 'hidden',
    overflowX: 'auto',
    height: 'inherit'
  },
  kanbanLaneColumn: {
    position: 'relative',
    top: 0,
    margin: '5px',
    textAlign: 'center',
    overflow: 'hidden'
  },
  laneListWrapper: {
    overflowY: 'auto',
    maxHeight: '80%',
    overflowX: 'hidden'
  },
  fetchItemsButton: {
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  laneItem: {
    overflow: 'hidden'
  },
  laneWrapper: {
    border: '1px dashed'
  }
});

export class KanbanBoard extends React.PureComponent<IKanbanBoardProps> {
  constructor(props: IKanbanBoardProps) {
    super(props);
  }
  public render(): JSX.Element {
    return (
      <div className={classNames.kanbanContainer}>
        {this.props.laneColumns.map(laneColumn => (
          <KanbanLane {...this.props} laneColumn={laneColumn} key={laneColumn.key} />
        ))}
      </div>
    );
  }
}
class KanbanLane extends React.PureComponent<IKanbanLaneProps, IKanbanLaneState> {
  private _laneColumnWidth: string = '200px';
  private _nextItemsCount: number = 3;
  constructor(props: IKanbanLaneProps) {
    super(props);
    this._laneColumnWidth = (this.props.laneColumn.width && this.props.laneColumn.width.toString() + 'px') || this._laneColumnWidth;
    this.state = {
      items: (this.props.getItems && this.props.getItems(this._nextItemsCount, this.props.laneColumn)) || []
    };
  }
  public render(): JSX.Element {
    const laneWrapperStyle = { width: this._laneColumnWidth };
    const { laneColumn } = this.props;
    return (
      <div style={laneWrapperStyle} className={classNames.laneWrapper}>
        {this._onRenderLaneColumn()}
        <div className={classNames.laneListWrapper}>
          <List items={this.state.items} onRenderCell={this._onRenderLaneItem} />
          <DefaultButton primary text={`${laneColumn.name}`} onClick={this._fetchItems} style={{ margin: 5 }} />
        </div>
      </div>
    );
  }

  private _fetchItems = () => {
    const { getItems, laneColumn } = this.props;
    const newItems = (getItems && getItems(this._nextItemsCount, laneColumn)) || [];
    this.setState(state => {
      // Important: read `state` instead of `this.state` when updating.
      return { items: [...state.items, ...newItems] };
    });
  };

  private _onRenderLaneItem = (item?: any, index?: number): JSX.Element => {
    const { onRenderLaneItem } = this.props;
    return <div className={classNames.laneItem}>{onRenderLaneItem && onRenderLaneItem(item, index)}</div>;
  };

  private _onRenderLaneColumn() {
    const { onRenderLaneColumn, laneColumn } = this.props;
    return (
      <div className={classNames.kanbanLaneColumn}>
        {onRenderLaneColumn ? onRenderLaneColumn : <div className={classNames.kanbanLaneColumn}>{laneColumn.name}</div>}
      </div>
    );
  }
}
