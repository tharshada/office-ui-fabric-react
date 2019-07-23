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
    maxHeight: 'inherit'
  },
  kanbanLaneColumn: {
    position: 'relative',
    top: 0,
    margin: '5px',
    textAlign: 'center',
    overflow: 'hidden'
  },
  laneListWrapper: {
    overflowY: 'auto'
  }
});

export class KanbanBoard extends React.PureComponent<IKanbanBoardProps> {
  constructor(props: IKanbanBoardProps) {
    super(props);
  }
  public render(): JSX.Element {
    const columns = this.props.laneColumns;
    return (
      <div className={classNames.kanbanContainer}>
        {columns.map((element, i) => (
          <div key={`lane#${i}`} style={{ border: '1px dashed' }}>
            <KanbanLane {...this.props} laneColumn={element} />
          </div>
        ))}
      </div>
    );
  }
}
class KanbanLane extends React.PureComponent<IKanbanLaneProps, IKanbanLaneState> {
  private _laneColumnWidth: string = '200px';
  constructor(props: IKanbanLaneProps) {
    super(props);
    this._laneColumnWidth = (this.props.laneColumn.width && this.props.laneColumn.width.toString() + 'px') || this._laneColumnWidth;
    this.state = {
      items: (this.props.getItems && this.props.getItems(this.props.laneColumn)) || []
    };
  }
  public render(): JSX.Element {
    const laneWrapperStyle = { width: this._laneColumnWidth };
    return (
      <div style={laneWrapperStyle}>
        {this._onRenderLaneColumn(this.props.laneColumn)}
        <div data-is-scrollable={true} className={classNames.laneListWrapper}>
          <List items={this.state.items} onRenderCell={this._onRenderLaneItem} />
          <DefaultButton primary text={`Fetch more items (${this.props.laneColumn.name})`} onClick={this._fetchItems} />
        </div>
      </div>
    );
  }

  private _fetchItems = () => {
    // improve this logic
    const newItems = (this.props.getItems && this.props.getItems(this.props.laneColumn)) || [];
    this.setState(state => {
      // Important: read `state` instead of `this.state` when updating.
      return { items: [...state.items, ...newItems] };
    });
  };

  private _onRenderLaneItem = (item?: any, index?: number): JSX.Element => {
    const { onRenderLaneItem } = this.props;
    return <div style={{ width: this._laneColumnWidth }}>{onRenderLaneItem && onRenderLaneItem(item, index)}</div>;
  };

  private _onRenderLaneColumn(laneColumn: ILaneColumn) {
    return (
      <div className={classNames.kanbanLaneColumn}>
        {this.props.onRenderLaneColumn ? (
          this.props.onRenderLaneColumn
        ) : (
          <div className={classNames.kanbanLaneColumn}>{this.props.laneColumn.name}</div>
        )}
      </div>
    );
  }
}
