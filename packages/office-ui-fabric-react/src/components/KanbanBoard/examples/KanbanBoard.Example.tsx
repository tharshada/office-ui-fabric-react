import * as React from 'react';
import { ILaneColumn } from '../KanbanBoard.types';
import { mergeStyleSets } from 'office-ui-fabric-react/lib/Styling';
import { KanbanBoard } from '../KanbanBoard';

interface IKanbanBoardExampleItem {
  col: string;
  otherColumn: string;
}
const classNamesExample = mergeStyleSets({
  wrapper: {
    position: 'relative',
    overflow: 'hidden',
    height: '40vh'
  },
  laneItemBorder: {
    border: '1px solid black',
    padding: '5px',
    margin: '5px'
  }
});

export class KanbanBoardExample extends React.Component {
  private _laneColumns: ILaneColumn[];
  private _numberOfColumns: number;
  private _items: IKanbanBoardExampleItem[];
  private _numberOfItems = 100;
  constructor(props: any) {
    super(props);
    this._laneColumns = [];
    this._numberOfColumns = 19;
    this._getItems = this._getItems.bind(this);
    for (let i = 0; i < this._numberOfColumns; i++) {
      this._laneColumns.push({
        name: 'value' + i,
        key: 'columnValue' + i
      });
    }
    this._items = [];
    for (let i = 0; i < this._numberOfItems; i++) {
      this._items.push({
        col: 'value' + (i % this._numberOfColumns),
        otherColumn: 'value column abc abc def' + i
      });
    }
    this.state = {
      items: this._items
    };
  }
  public render() {
    return (
      <div className={classNamesExample.wrapper} data-is-scrollable={true}>
        <KanbanBoard laneColumns={this._laneColumns} getItems={this._getItems} onRenderLaneItem={this._onRenderLaneItem} />
        {/* <List items={this._items} onRenderCell={this._onRenderLaneItem} /> */}
      </div>
    );
  }
  private _getItems(laneColumn: ILaneColumn) {
    return (
      this._items &&
      this._items.filter(item => {
        return item.col === laneColumn.name;
      })
    );
  }
  private _onRenderLaneItem(item?: IKanbanBoardExampleItem, index?: number) {
    console.log('on render item');
    return (
      <div className={classNamesExample.laneItemBorder}>
        <div>{item!.col}</div>
        <div>{item!.otherColumn}</div>
      </div>
    );
  }
}
