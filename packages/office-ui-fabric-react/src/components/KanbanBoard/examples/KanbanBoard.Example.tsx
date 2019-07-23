import * as React from 'react';
import { ILaneColumn } from '../KanbanBoard.types';
import { mergeStyleSets } from 'office-ui-fabric-react/lib/Styling';
import { KanbanBoard } from '../KanbanBoard';
import { createListItems } from 'office-ui-fabric-react/lib/utilities/exampleData';

interface IKanbanBoardExampleItem {
  col: string;
  otherColumn: string;
  color: string;
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
  private _numberOfItems = 30;
  private _location: { [key: string]: boolean };
  private _colors = ['#05ffb0', '#fc6fc6', '#959595', '#008877'];
  constructor(props: any) {
    super(props);
    this._location = {};
    this._items = createListItems(this._numberOfItems).map((item, i) => {
      this._location[item.location] = true;
      return {
        ...item,
        color: this._colors[i % this._colors.length],
        col: item.location,
        otherColumn: 'value column ' + i
      };
    });
    const location = Object.keys(this._location);
    this._numberOfColumns = location.length;
    this._laneColumns = [];
    for (let i = 0; i < this._numberOfColumns; i++) {
      this._laneColumns.push({
        name: location[i],
        key: 'columnValue' + i
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
  private _getItems = (laneColumn: ILaneColumn) => {
    return (
      this._items &&
      this._items.filter(item => {
        return item.col === laneColumn.name;
      })
    );
  };
  private _onRenderLaneItem(item?: IKanbanBoardExampleItem, index?: number) {
    console.log('on render item');
    return (
      <div className={classNamesExample.laneItemBorder} style={{ background: item!.color }}>
        <div>{item!.col}</div>
        <div>{item!.otherColumn}</div>
      </div>
    );
  }
}
