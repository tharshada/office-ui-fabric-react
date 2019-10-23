import * as PropTypes from 'prop-types';
import * as React from 'react';
import { BaseComponent } from '../../Utilities';
import { ScrollablePaneContext } from '../ScrollablePane/ScrollablePane.types';
import { IStickyProps, StickyPositionType } from './Sticky.types';

export interface IStickyState {
  isStickyTop: boolean;
  isStickyBottom: boolean;
  distanceFromTop?: number;
}

export interface IStickyContext {
  scrollablePane: PropTypes.Requireable<object>;
}

const stickyPositionBoth = StickyPositionType.Both;

export class Sticky extends BaseComponent<IStickyProps, IStickyState> {
  public static defaultProps: IStickyProps = {
    stickyPosition: stickyPositionBoth,
    isScrollSynced: true
  };

  public static contextType = ScrollablePaneContext;

  private _root = React.createRef<HTMLDivElement>();
  private _stickyContentTop = React.createRef<HTMLDivElement>();
  private _stickyContentBottom = React.createRef<HTMLDivElement>();
  private _nonStickyContent = React.createRef<HTMLDivElement>();
  private _placeHolder = React.createRef<HTMLDivElement>();
  private _activeElement: HTMLElement | undefined;

  constructor(props: IStickyProps) {
    super(props);
    this.state = {
      isStickyTop: false,
      isStickyBottom: false,
      distanceFromTop: undefined
    };
    this._activeElement = undefined;
  }

  public get root(): HTMLDivElement | null {
    return this._root.current;
  }

  public get placeholder(): HTMLDivElement | null {
    return this._placeHolder.current;
  }

  public get stickyContentTop(): HTMLDivElement | null {
    return this._stickyContentTop.current;
  }

  public get stickyContentBottom(): HTMLDivElement | null {
    return this._stickyContentBottom.current;
  }

  public get nonStickyContent(): HTMLDivElement | null {
    return this._nonStickyContent.current;
  }

  public get canStickyTop(): boolean {
    return _canSticky(StickyPositionType.Header, this.props.stickyPosition);
  }

  public get canStickyBottom(): boolean {
    return _canSticky(StickyPositionType.Footer, this.props.stickyPosition);
  }

  public syncScroll = (container: HTMLElement): void => {
    const { nonStickyContent } = this;

    if (nonStickyContent && this.props.isScrollSynced) {
      nonStickyContent.scrollLeft = container.scrollLeft;
    }
  };

  public componentDidMount(): void {
    const { scrollablePane } = this.context;

    if (!scrollablePane) {
      return;
    }

    scrollablePane.subscribe(this._onScrollEvent);
    scrollablePane.addSticky(this);
  }

  public componentWillUnmount(): void {
    const { scrollablePane } = this.context;

    if (!scrollablePane) {
      return;
    }

    scrollablePane.unsubscribe(this._onScrollEvent);
    scrollablePane.removeSticky(this);
  }

  public componentDidUpdate(prevProps: IStickyProps, prevState: IStickyState): void {
    const { scrollablePane } = this.context;

    if (!scrollablePane) {
      return;
    }
    const { state } = this;
    let syncScroll: boolean = false;
    if (prevState.distanceFromTop !== state.distanceFromTop) {
      scrollablePane.sortSticky(this, true /*sortAgain*/);
      syncScroll = true;
    }
    if (prevState.isStickyTop !== state.isStickyTop || prevState.isStickyBottom !== state.isStickyBottom) {
      const activeElement = this._activeElement;
      if (activeElement) {
        activeElement.focus();
      }
      scrollablePane.updateStickyRefHeights();
      syncScroll = true;
    }
    if (syncScroll) {
      // Sync Sticky scroll position with content container on each update
      scrollablePane.syncScrollSticky(this);
    }
  }

  public shouldComponentUpdate(nextProps: IStickyProps, nextState: IStickyState): boolean {
    if (!this.context.scrollablePane) {
      return true;
    }

    const { state, props } = this;
    const nonStickyContent = this._nonStickyContent;

    return (state.isStickyTop !== nextState.isStickyTop ||
      state.isStickyBottom !== nextState.isStickyBottom ||
      props.stickyPosition !== nextProps.stickyPosition ||
      props.children !== nextProps.children ||
      state.distanceFromTop !== nextState.distanceFromTop ||
      _isOffsetHeightDifferent(nonStickyContent, this._stickyContentTop) ||
      _isOffsetHeightDifferent(nonStickyContent, this._stickyContentBottom) ||
      _isOffsetHeightDifferent(nonStickyContent, this._placeHolder)) as boolean;
  }

  public render(): JSX.Element {
    const { props, state, nonStickyContent, root } = this;
    const { isStickyTop, isStickyBottom } = state;

    if (!this.context.scrollablePane) {
      return <div>{props.children}</div>;
    }

    return (
      <div ref={this._root}>
        {this.canStickyTop && _getStickyContent(this._stickyContentTop, nonStickyContent, root, isStickyTop, props)}
        {this.canStickyBottom && _getStickyContent(this._stickyContentBottom, nonStickyContent, root, isStickyBottom, props)}
        <div style={_getNonStickyPlaceholderHeightAndWidth(isStickyBottom || isStickyTop, nonStickyContent)} ref={this._placeHolder}>
          <div
            ref={this._nonStickyContent}
            className={isStickyTop || isStickyBottom ? props.stickyClassName : undefined}
            style={_getContentStyles(isStickyTop || isStickyBottom, root, props.stickyBackgroundColor)}
          >
            {props.children}
          </div>
        </div>
      </div>
    );
  }

  public addSticky(stickyContent: HTMLDivElement): void {
    const nonStickyContent = this.nonStickyContent;
    if (nonStickyContent) {
      stickyContent.appendChild(nonStickyContent);
    }
  }

  public resetSticky(): void {
    const { nonStickyContent, placeholder } = this;
    if (nonStickyContent && placeholder) {
      placeholder.appendChild(nonStickyContent);
    }
  }

  public setDistanceFromTop(container: HTMLDivElement): void {
    const distanceFromTop = _getNonStickyDistanceFromTop(container, this.root);
    this.setState({ distanceFromTop: distanceFromTop });
  }

  private _onScrollEvent = (container: HTMLElement, footerStickyContainer: HTMLElement): void => {
    const { root, canStickyTop } = this;
    const { isStickyBottom, isStickyTop } = this.state;
    if (root && this.nonStickyContent) {
      const distanceFromTop = _getNonStickyDistanceFromTop(container, root);
      let _isStickyTop = false,
        _isStickyBottom = false;

      if (canStickyTop) {
        const distanceToStickTop = distanceFromTop - _getStickyDistanceFromTop(this.stickyContentTop);
        _isStickyTop = distanceToStickTop < container.scrollTop;
      }

      // Can sticky bottom if the scrollablePane - total sticky footer height is smaller than the sticky's distance from the top of the pane
      if (this.canStickyBottom && container.clientHeight - _getOffsetHeight(footerStickyContainer) <= distanceFromTop) {
        _isStickyBottom =
          distanceFromTop - Math.floor(container.scrollTop) >=
          _getStickyDistanceFromTopForFooter(container, footerStickyContainer, this.stickyContentBottom);
      }
      const documentActiveElement = document.activeElement;
      if (
        documentActiveElement &&
        this.nonStickyContent.contains(documentActiveElement) &&
        (isStickyTop !== _isStickyTop || isStickyBottom !== _isStickyBottom)
      ) {
        this._activeElement = documentActiveElement as HTMLElement;
      } else {
        this._activeElement = undefined;
      }

      this.setState({
        isStickyTop: canStickyTop && _isStickyTop,
        isStickyBottom: _isStickyBottom,
        distanceFromTop: distanceFromTop
      });
    }
  };
}

/**
 * Gets background of nearest parent element that has a declared background-color attribute
 */
function _getBackgroundOfNearestAncestor(curr: HTMLElement | null): string | undefined {
  if (!curr) {
    return undefined;
  }
  let backgroundColor = _getComputedStyle(curr, BACKGROUNDCOLORSTRING);
  while (backgroundColor === 'rgba(0, 0, 0, 0)' || backgroundColor === 'transparent') {
    if (curr.tagName === 'HTML') {
      // Fallback color if no element has a declared background-color attribute
      return undefined;
    }
    if (curr.parentElement) {
      curr = curr.parentElement;
    }
    backgroundColor = _getComputedStyle(curr, BACKGROUNDCOLORSTRING);
  }
  return backgroundColor;
}

/**
 * @param curr HTMLElement for which style is to be computed
 * @param propertyName name of style property which is to be computed
 */
function _getComputedStyle(curr: HTMLElement, propertyName: string): string {
  return window.getComputedStyle(curr).getPropertyValue(propertyName);
}

const BACKGROUNDCOLORSTRING: string = 'background-color';

function _isOffsetHeightDifferent(a: React.RefObject<HTMLElement>, b: React.RefObject<HTMLDivElement>): boolean {
  const _a = a.current;
  const _b = b.current;
  return (_a && _b && _getOffsetHeight(_a) !== _getOffsetHeight(_b)) as boolean;
}

function _canSticky(expectedStickyPosition: StickyPositionType, stickyPosition?: StickyPositionType) {
  return stickyPosition === stickyPositionBoth || stickyPosition === expectedStickyPosition;
}

function _getNonStickyPlaceholderHeightAndWidth(isSticky: boolean, nonStickyContent: HTMLDivElement | null): React.CSSProperties {
  if (isSticky) {
    let height = 0,
      width = 0;
    // Why is placeHolder width needed?
    // ScrollablePane content--container is reponsible for providing scrollbars depending on content overflow.
    // If the overflow is caused by content of sticky component when it is in non-sticky state,
    // ScrollablePane content--conatiner will provide horizontal scrollbar.
    // If the component becomes sticky, i.e., when state.isStickyTop || state.isStickyBottom becomes true,
    // it's actual content is no more inside ScrollablePane content--container.
    // ScrollablePane content--conatiner will see no need for horizontal scrollbar. (Assuming no other content is causing overflow)
    // The complete content of sticky component will not be viewable.
    // It is necessary to provide a placeHolder of a certain width (height is already being set) in the content--container,
    // to get a horizontal scrollbar & be able to view the complete content of sticky component.
    if (nonStickyContent && nonStickyContent.firstElementChild) {
      height = _getOffsetHeight(nonStickyContent);
      // What value should be substituted for placeHolder width?
      // Assumption:
      //    1. Content inside <Sticky> should always be wrapped in a single div.
      //        <Sticky><div id={'firstElementChild'}>{intended_content}</div><Sticky/>
      //    2. -ve padding, margin, etc. are not be used.
      //    3. scrollWidth of a parent is greater than or equal to max of scrollWidths of it's children and same holds for children.
      // placeHolder width should be computed in the best possible way to prevent overscroll/underscroll.
      const nonStickyContentFirstElementChild = nonStickyContent.firstElementChild;
      width =
        nonStickyContentFirstElementChild.scrollWidth +
        ((nonStickyContentFirstElementChild as HTMLElement).offsetWidth - nonStickyContentFirstElementChild.clientWidth);
    }
    return {
      height: height,
      width: width
    };
  } else {
    return {};
  }
}

function _getNonStickyDistanceFromTop(container: HTMLElement, currElem: HTMLDivElement | null): number {
  let distance = 0;
  if (currElem) {
    while (currElem && _getoffsetParent(currElem) !== container) {
      distance += _getOffsetTop(currElem);
      currElem = _getoffsetParent(currElem) as HTMLDivElement;
    }

    if (currElem && _getoffsetParent(currElem) === container) {
      distance += _getOffsetTop(currElem);
    }
  }
  return distance;
}

function _getStickyDistanceFromTop(stickyContentTop: HTMLDivElement | null): number {
  let distance = 0;
  if (stickyContentTop) {
    distance = _getOffsetTop(stickyContentTop);
  }

  return distance;
}

function _getStickyDistanceFromTopForFooter(
  container: HTMLElement,
  footerStickyVisibleContainer: HTMLElement,
  stickyContentBottom: HTMLDivElement | null
): number {
  let distance = 0;
  if (stickyContentBottom) {
    distance = container.clientHeight - _getOffsetHeight(footerStickyVisibleContainer) + _getOffsetTop(stickyContentBottom);
  }

  return distance;
}

function _getStickyPlaceholderHeight(isSticky: boolean, nonStickyContent: HTMLDivElement | null): React.CSSProperties {
  const height = nonStickyContent ? _getOffsetHeight(nonStickyContent) : 0;
  return {
    visibility: isSticky ? 'hidden' : 'visible',
    height: isSticky ? 0 : height
  };
}

function _getContentStyles(isSticky: boolean, root: HTMLDivElement | null, stickyBackgroundColor?: string): React.CSSProperties {
  return {
    backgroundColor: stickyBackgroundColor || _getBackgroundOfNearestAncestor(root),
    overflow: isSticky ? 'hidden' : ''
  };
}

function _getStickyContent(
  stickyContentRef: React.RefObject<HTMLDivElement>,
  nonStickyContent: HTMLDivElement | null,
  root: HTMLDivElement | null,
  isSticky: boolean,
  props: IStickyProps
): JSX.Element {
  return (
    <div ref={stickyContentRef} aria-hidden={!isSticky} style={{ pointerEvents: isSticky ? 'auto' : 'none' }}>
      <div style={_getStickyPlaceholderHeight(isSticky, nonStickyContent)} />
    </div>
  );
}

// debatable

/**
 * Returns elem.offsetHeight
 * @param elem - HTMLElement for which offsetHeight is to be calculated
 */
function _getOffsetHeight(elem: HTMLElement): number {
  return elem.offsetHeight;
}

/**
 * Returns elem.offsetParent
 * @param elem
 */
function _getoffsetParent(elem: HTMLElement): Element | null {
  return elem.offsetParent;
}

/**
 * Returns elem.offsetTop
 * @param elem
 */
function _getOffsetTop(elem: HTMLElement): number {
  return elem.offsetTop;
}
