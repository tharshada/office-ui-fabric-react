import * as React from 'react';
import { Sticky } from './Sticky';
import { IRefObject } from '../../Utilities';

export interface IStickyProps extends React.Props<Sticky> {
  /**
   * Gets ref to component interface.
   */
  componentRef?: IRefObject<IStickyProps>;

  /**
   * Class name to apply to the sticky element if component is sticky.
   */
  stickyClassName?: string;

  /**
   * color to apply as 'background-color' style for sticky element.
   */
  stickyBackgroundColor?: string;

  /**
   * Region to render sticky component in.
   * @defaultvalue Both
   */
  stickyPosition?: StickyPositionType;

  /**
   * If true, then match scrolling position of placeholder element in Sticky.
   * @defaultvalue true
   */
  isScrollSynced?: boolean;

  /**
   * If it is other than default, stickyPosition should either be 'Top' or 'Bottom'
   * Best Practices: use same stickyBehavior Type for all stickies with same stickyPosition
   */
  stickyBehavior?: IStickyBehavior;

  /**If true, it uses actual element as placeholder */
  placeHolder?: boolean;
}

export interface IStickyBehavior {
  type: StickyBehaviorType;
  order: number;
}
export enum StickyBehaviorType {
  StickyOnScroll = 1,
  StickyAlways = 2
}
export enum StickyPositionType {
  Both = 0,
  Header = 1,
  Footer = 2
}
