import * as PropTypes from 'prop-types';
import * as React from 'react';
import { BaseComponent } from '../../Utilities';
import { IScrollablePaneContext, ScrollablePaneContext } from '../ScrollablePane/ScrollablePane.types';
import { IStickyProps, StickyPositionType } from './Sticky.types';

export interface IStickyState {
  isStickyTop: boolean;
  isStickyBottom: boolean;
  distanceFromTop?: number;
}

export interface IStickyContext {
  scrollablePane: PropTypes.Requireable<object>;
}

export class Sticky extends BaseComponent<IStickyProps, IStickyState> {
  public static defaultProps: IStickyProps = {
    stickyPosition: StickyPositionType.Both,
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
    return this.props.stickyPosition === StickyPositionType.Both || this.props.stickyPosition === StickyPositionType.Header;
  }

  public get canStickyBottom(): boolean {
    return this.props.stickyPosition === StickyPositionType.Both || this.props.stickyPosition === StickyPositionType.Footer;
  }

  public syncScroll = (container: HTMLElement): void => {
    const { nonStickyContent, stickyContentTop, stickyContentBottom, state, context } = this;
    const { isStickyBottom, isStickyTop } = state;
    const { scrollablePane } = context;
    // scroll sync is needed only if current state is sticky
    if (!scrollablePane || !this.props.isScrollSynced || !(isStickyBottom || isStickyTop)) {
      return;
    }
    const containerScrollLeft = scrollablePane.getHorizontalScrollPosition();
    const usePlaceholderForSticky = !scrollablePane.optimizeForPerformace();
    const stickyContent = isStickyTop ? stickyContentTop : stickyContentBottom;
    if (!usePlaceholderForSticky && stickyContent && stickyContent.children && stickyContent.children.length > 0) {
      stickyContent.children[0].scrollLeft = containerScrollLeft;
    } else if (nonStickyContent) {
      nonStickyContent.scrollLeft = containerScrollLeft;
    }
  };

  public componentDidMount(): void {
    const { scrollablePane } = this._getContext();

    if (!scrollablePane) {
      return;
    }

    scrollablePane.subscribe(this._onScrollEvent);
    scrollablePane.addSticky(this);
  }

  public componentWillUnmount(): void {
    const { scrollablePane } = this._getContext();

    if (!scrollablePane) {
      return;
    }

    scrollablePane.unsubscribe(this._onScrollEvent);
    scrollablePane.removeSticky(this);
  }

  public componentDidUpdate(prevProps: IStickyProps, prevState: IStickyState): void {
    const { scrollablePane } = this._getContext();

    if (!scrollablePane) {
      return;
    }

    const { isStickyBottom, isStickyTop, distanceFromTop } = this.state;
    if (prevState.distanceFromTop !== distanceFromTop) {
      scrollablePane.sortSticky(this, true /*sortAgain*/);
    }
    if (prevState.isStickyTop !== isStickyTop || prevState.isStickyBottom !== isStickyBottom) {
      if (this._activeElement) {
        this._activeElement.focus();
      }
      scrollablePane.updateStickyRefHeights();
    }
    if (scrollablePane.getUserInteractionStatus()) {
      // Sync Sticky scroll position with content container on each update
      scrollablePane.syncScrollSticky(this);
    }
  }

  public shouldComponentUpdate(nextProps: IStickyProps, nextState: IStickyState): boolean {
    const { scrollablePane } = this.context;
    if (!scrollablePane) {
      return true;
    }

    const { isStickyTop, isStickyBottom, distanceFromTop } = this.state;

    return (isStickyTop !== nextState.isStickyTop ||
      isStickyBottom !== nextState.isStickyBottom ||
      this.props.stickyPosition !== nextProps.stickyPosition ||
      this.props.children !== nextProps.children ||
      distanceFromTop !== nextState.distanceFromTop ||
      (!scrollablePane.optimizeForPerformace() &&
        _isOffsetHeightDifferent(this._nonStickyContent, this._stickyContentTop, this._stickyContentBottom, this._placeHolder))) as boolean;
  }

  public render(): JSX.Element {
    const { state, context, canStickyBottom, canStickyTop, nonStickyContent } = this;
    const { isStickyTop, isStickyBottom } = state;
    const { stickyClassName, children, stickyBackgroundColor } = this.props;

    const scrollablePaneContext = context ? context.scrollablePane : undefined;
    if (!scrollablePaneContext) {
      return <div>{this.props.children}</div>;
    }

    return (
      <div ref={this._root}>
        {canStickyTop && this._getStickyContent(StickyPositionType.Header, isStickyTop)}
        {canStickyBottom && this._getStickyContent(StickyPositionType.Footer, isStickyBottom)}
        <div
          style={_getNonStickyPlaceholderHeightAndWidth(
            {
              state,
              canStickyTop,
              canStickyBottom,
              nonStickyContent
            },
            scrollablePaneContext.optimizeForPerformace()
          )}
          ref={this._placeHolder}
        >
          <div
            ref={this._nonStickyContent}
            className={isStickyTop || isStickyBottom ? stickyClassName : undefined}
            style={_getContentStyles(isStickyTop || isStickyBottom, this.root, stickyBackgroundColor)}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }

  public addSticky(stickyContent: HTMLDivElement): void {
    const placeholderUsedForStickyContent = !this.context.scrollablePane.optimizeForPerformace();
    if (placeholderUsedForStickyContent && this.nonStickyContent) {
      stickyContent.appendChild(this.nonStickyContent);
    }
  }

  public resetSticky(): void {
    const placeholderUsedForStickyContent = !this.context.scrollablePane.optimizeForPerformace();
    if (placeholderUsedForStickyContent && this.nonStickyContent && this.placeholder) {
      this.placeholder.appendChild(this.nonStickyContent);
    }
  }

  public setDistanceFromTop(container: HTMLDivElement): void {
    /**
     * Get distance for non sticky root div from container
     */
    const distanceFromTop = _getNonStickyDistanceFromTop(container, this.root);
    this.setState({ distanceFromTop: distanceFromTop });
  }

  private _getContext = (): IScrollablePaneContext => this.context;

  private _getStickyContent(stickyPositionType: StickyPositionType, isSticky: boolean): JSX.Element {
    const { stickyClassName, children, stickyBackgroundColor } = this.props;
    const { scrollablePane } = this.context;
    // decide if actual element is to be replicated or placeholder is be to used.
    const usePlaceholderForStickyContent = !scrollablePane.optimizeForPerformace();
    return (
      <div
        ref={stickyPositionType === StickyPositionType.Header ? this._stickyContentTop : this._stickyContentBottom}
        aria-hidden={!isSticky}
        style={{ pointerEvents: isSticky ? 'auto' : 'none' }}
      >
        {usePlaceholderForStickyContent ? (
          <div style={_getStickyPlaceholderStyles(isSticky, this.nonStickyContent)} />
        ) : (
          <div
            className={isSticky ? stickyClassName : undefined}
            style={_getStickyContentStyles(isSticky, this.root, stickyBackgroundColor)}
          >
            {children}
          </div>
        )}
      </div>
    );
  }

  private _onScrollEvent = (container: HTMLElement, footerStickyContainer: HTMLElement): void => {
    const { scrollablePane } = this.context;
    if (!this.root || !this.nonStickyContent || !scrollablePane) {
      return;
    }
    const perfOptimization = scrollablePane.optimizeForPerformance();
    if (perfOptimization && this.canStickyBottom) {
      /**
       * 1. ScrollablePane is mounted and has called notifySubscriber
       * 2. stickyAlways has to re-render if mutation could 've affected it's children
       */
      this.setState({
        isStickyTop: false,
        isStickyBottom: true,
        distanceFromTop: 0 // must so that sorting happens.
      });
    } else if (perfOptimization && this.canStickyTop && !scrollablePane.getUserInteractionStatus()) {
      // user interaction has not started
      // 1. ScrollablePane is mounted and has called notifySubscriber, sort is required.
      // 2. StickyOnScroll has to re-render if mutation could 've affected it's children.
      const { isStickyBottom, isStickyTop } = this.state;
      scrollablePane.sortSticky(this, false);
      this.setState({
        isStickyBottom: isStickyBottom,
        isStickyTop: isStickyTop
      });
    } else {
      const distanceFromTop = _getNonStickyDistanceFromTop(container, this.root);
      let isStickyTop = false;
      let isStickyBottom = false;

      if (this.canStickyTop) {
        const distanceToStickTop = distanceFromTop - _getStickyDistanceFromTop(this.stickyContentTop);
        isStickyTop = distanceToStickTop < container.scrollTop;
      }

      // Can sticky bottom if the scrollablePane - total sticky footer height is smaller than the sticky's distance from the top of the pane
      if (this.canStickyBottom && container.clientHeight - footerStickyContainer.offsetHeight <= distanceFromTop) {
        isStickyBottom =
          distanceFromTop - Math.floor(container.scrollTop) >=
          _getStickyDistanceFromTopForFooter(container, footerStickyContainer, this.stickyContentBottom);
      }

      if (
        document.activeElement &&
        this.nonStickyContent.contains(document.activeElement) &&
        (this.state.isStickyTop !== isStickyTop || this.state.isStickyBottom !== isStickyBottom)
      ) {
        this._activeElement = document.activeElement as HTMLElement;
      } else {
        this._activeElement = undefined;
      }

      this.setState({
        isStickyTop: this.canStickyTop && isStickyTop,
        isStickyBottom: isStickyBottom,
        distanceFromTop: distanceFromTop
      });
    }
  };
}

/**
 * Checks if a & b have same offsetHeight
 * @param a
 * @param b
 */
function _isOffsetHeightDifferentUtil(a: React.RefObject<HTMLElement>, b: React.RefObject<HTMLDivElement>): boolean {
  return (a && b && a.current && b.current && a.current.offsetHeight !== b.current.offsetHeight) as boolean;
}

/**
 * Checks if offsetHeight for any of - stickyContentTop, stickyContentBottom, placeholder differs from nonStickyContent
 * @param nonStickyContent
 * @param stickyContentTop
 * @param stickyContentBottom
 * @param placeholder
 */
function _isOffsetHeightDifferent(
  nonStickyContent: React.RefObject<HTMLElement>,
  stickyContentTop: React.RefObject<HTMLDivElement>,
  stickyContentBottom: React.RefObject<HTMLDivElement>,
  placeholder: React.RefObject<HTMLDivElement>
): boolean {
  return (
    _isOffsetHeightDifferentUtil(nonStickyContent, stickyContentTop) ||
    _isOffsetHeightDifferentUtil(nonStickyContent, stickyContentBottom) ||
    _isOffsetHeightDifferentUtil(nonStickyContent, placeholder)
  );
}
/**
 * Returns placeholder height & width for sticky component's non-sticky content
 */
function _getNonStickyPlaceholderHeightAndWidth(
  sticky: {
    state: IStickyState;
    canStickyTop: boolean;
    canStickyBottom: boolean;
    nonStickyContent: HTMLDivElement | null;
  },
  experimentalLayoutsFlag: boolean
): React.CSSProperties {
  const { isStickyTop, isStickyBottom } = sticky.state;
  const { nonStickyContent } = sticky;
  const usePlaceholderForSticky = !experimentalLayoutsFlag;
  if ((isStickyTop || isStickyBottom) && usePlaceholderForSticky) {
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
      height = nonStickyContent.offsetHeight;
      // What value should be substituted for placeHolder width?
      // Assumption:
      //    1. Content inside <Sticky> should always be wrapped in a single div.
      //        <Sticky><div id={'firstElementChild'}>{intended_content}</div><Sticky/>
      //    2. -ve padding, margin, etc. are not be used.
      //    3. scrollWidth of a parent is greater than or equal to max of scrollWidths of it's children and same holds for children.
      // placeHolder width should be computed in the best possible way to prevent overscroll/underscroll.
      width =
        nonStickyContent.firstElementChild.scrollWidth +
        ((nonStickyContent.firstElementChild as HTMLElement).offsetWidth - nonStickyContent.firstElementChild.clientWidth);
    }
    return {
      height: height,
      width: width
    };
  } else {
    return {};
  }
}

/**
 * Gets background of nearest parent element that has a declared background-color attribute
 */
function _getBackgroundOfNearestAncestor(root: HTMLDivElement | null): string | undefined {
  if (!root) {
    return undefined;
  }
  let curr: HTMLElement = root;
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

/**
 * Gets distance for curr div from ancestor container div
 * @param container
 * @param curr
 */
function _getNonStickyDistanceFromTop(container: HTMLElement, curr: HTMLDivElement | null): number {
  let distance = 0;
  let currElem = curr;
  if (currElem) {
    while (currElem && currElem.offsetParent !== container) {
      distance += currElem.offsetTop;
      currElem = currElem.offsetParent as HTMLDivElement;
    }

    if (currElem && currElem.offsetParent === container) {
      distance += currElem.offsetTop;
    }
  }
  return distance;
}

/**
 * Gets style for sticky content
 * @param isSticky Pass true, if state is sticky
 * @param root
 * @param stickyBackgroundColor
 */
function _getStickyContentStyles(isSticky: boolean, root: HTMLDivElement | null, stickyBackgroundColor?: string): React.CSSProperties {
  return {
    visibility: isSticky ? 'visible' : 'hidden',
    pointerEvents: isSticky ? 'auto' : 'none',
    overflow: 'hidden',
    backgroundColor: stickyBackgroundColor || _getBackgroundOfNearestAncestor(root)
  };
}

/**
 * Gets placeholder styles for sticky div
 * @param isSticky Pass true, if state is sticky
 * @param nonStickyContent
 */
function _getStickyPlaceholderStyles(isSticky: boolean, nonStickyContent: HTMLDivElement | null): React.CSSProperties {
  const height = nonStickyContent ? nonStickyContent.offsetHeight : 0;
  return {
    visibility: isSticky ? 'hidden' : 'visible',
    height: isSticky ? 0 : height
  };
}

/**
 *
 * @param isSticky Pass true, if state is sticky
 * @param root
 * @param stickyBackgroundColor
 */
function _getContentStyles(isSticky: boolean, root: HTMLDivElement | null, stickyBackgroundColor?: string): React.CSSProperties {
  return {
    backgroundColor: stickyBackgroundColor || _getBackgroundOfNearestAncestor(root),
    overflow: isSticky ? 'hidden' : ''
  };
}

function _getStickyDistanceFromTop(stickyContentTop: HTMLDivElement | null): number {
  return stickyContentTop ? stickyContentTop.offsetTop : 0;
}

function _getStickyDistanceFromTopForFooter(
  container: HTMLElement,
  footerStickyVisibleContainer: HTMLElement,
  stickyContentBottom: HTMLDivElement | null
): number {
  return stickyContentBottom ? container.clientHeight - footerStickyVisibleContainer.offsetHeight + stickyContentBottom.offsetTop : 0;
}
