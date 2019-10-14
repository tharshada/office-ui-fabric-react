import * as React from 'react';
import { BaseComponent, classNamesFunction, divProperties, getNativeProps, getRTL } from '../../Utilities';
import {
  IScrollablePane,
  IScrollablePaneContext,
  IScrollablePaneProps,
  IScrollablePaneStyleProps,
  IScrollablePaneStyles,
  ScrollablePaneContext,
  ScrollbarVisibility
} from './ScrollablePane.types';
import { Sticky, StickyPositionType } from '../../Sticky';

export interface IScrollablePaneState {
  stickyTopHeight: number;
  stickyBottomHeight: number;
  scrollbarWidth: number;
  scrollbarHeight: number;
}

const getClassNames = classNamesFunction<IScrollablePaneStyleProps, IScrollablePaneStyles>();

export class ScrollablePaneBase extends BaseComponent<IScrollablePaneProps, IScrollablePaneState> implements IScrollablePane {
  private _root = React.createRef<HTMLDivElement>();
  private _stickyAboveRef = React.createRef<HTMLDivElement>();
  private _stickyBelowRef = React.createRef<HTMLDivElement>();
  private _contentContainer = React.createRef<HTMLDivElement>();
  private _subscribers: Set<Function>;
  private _stickies: Set<Sticky>;
  private _mutationObserver: MutationObserver;
  private _notifyThrottled: () => void;
  private _scrollLeft: number;
  private _userHasInteracted: boolean;

  constructor(props: IScrollablePaneProps) {
    super(props);
    this._subscribers = new Set<Function>();
    this._stickies = new Set<Sticky>();
    const { readScrollbarHeight, readScrollbarWidth, scrollbarVisibility } = props;
    this.state = {
      stickyTopHeight: 0,
      stickyBottomHeight: 0,
      scrollbarWidth: scrollbarVisibility === ScrollbarVisibility.always && readScrollbarWidth ? readScrollbarWidth() : 0,
      scrollbarHeight: scrollbarVisibility === ScrollbarVisibility.always && readScrollbarHeight ? readScrollbarHeight() : 0
    };

    this._notifyThrottled = this._async.throttle(this.notifySubscribers, 50);
  }

  public get root(): HTMLDivElement | null {
    return this._root.current;
  }

  public get stickyAbove(): HTMLDivElement | null {
    return this._stickyAboveRef.current;
  }

  public get stickyBelow(): HTMLDivElement | null {
    return this._stickyBelowRef.current;
  }

  public get contentContainer(): HTMLDivElement | null {
    return this._contentContainer.current;
  }

  public componentDidMount() {
    const { initialScrollPosition } = this.props;
    this._events.on(this.contentContainer, 'scroll', this._onScroll);
    this._events.on(window, 'resize', this._onWindowResize);
    if (this.contentContainer && initialScrollPosition) {
      this.contentContainer.scrollTop = initialScrollPosition;
    }

    // Set sticky distances from top property, then sort in correct order and notify subscribers
    this.setStickiesDistanceFromTop();
    this._stickies.forEach(sticky => {
      this.sortSticky(sticky);
    });
    this.notifySubscribers();

    if ('MutationObserver' in window) {
      this._mutationObserver = new MutationObserver(mutation => {
        // Function to check if mutation is occuring in stickyAbove or stickyBelow
        function checkIfMutationIsSticky(mutationRecord: MutationRecord): boolean {
          if (this.stickyAbove !== null && this.stickyBelow !== null) {
            return this.stickyAbove.contains(mutationRecord.target) || this.stickyBelow.contains(mutationRecord.target);
          }
          return false;
        }

        // Compute the scrollbar height which might have changed due to change in width of the content which might cause overflow
        const scrollbarHeight = this._getScrollbarHeight();
        // check if the scroll bar height has changed and update the state so that it's postioned correctly below sticky footer
        if (scrollbarHeight !== this.state.scrollbarHeight) {
          this.setState({
            scrollbarHeight: scrollbarHeight
          });
        }

        // Notify subscribers again to re-check whether Sticky should be Sticky'd or not
        this.notifySubscribers();

        // If mutation occurs in sticky header or footer, then update sticky top/bottom heights
        if (mutation.some(checkIfMutationIsSticky.bind(this))) {
          this.updateStickyRefHeights();
        } else {
          // If mutation occurs in scrollable region, then find Sticky it belongs to and force update
          const stickyList: Sticky[] = [];
          this._stickies.forEach(sticky => {
            if (sticky.root && sticky.root.contains(mutation[0].target)) {
              stickyList.push(sticky);
            }
          });
          if (stickyList.length) {
            stickyList.forEach(sticky => {
              sticky.forceUpdate();
            });
          }
        }
      });

      if (this.root) {
        this._mutationObserver.observe(this.root, {
          childList: true,
          attributes: true,
          subtree: true,
          characterData: true
        });
      }
    }
  }

  public componentWillUnmount() {
    this._events.off(this.contentContainer);
    this._events.off(window);

    if (this._mutationObserver) {
      this._mutationObserver.disconnect();
    }
  }

  // Only updates if props/state change, just to prevent excessive setState with updateStickyRefHeights
  public shouldComponentUpdate(nextProps: IScrollablePaneProps, nextState: IScrollablePaneState): boolean {
    return (
      this.props.children !== nextProps.children ||
      this.props.initialScrollPosition !== nextProps.initialScrollPosition ||
      this.props.className !== nextProps.className ||
      this.state.stickyTopHeight !== nextState.stickyTopHeight ||
      this.state.stickyBottomHeight !== nextState.stickyBottomHeight ||
      this.state.scrollbarWidth !== nextState.scrollbarWidth ||
      this.state.scrollbarHeight !== nextState.scrollbarHeight
    );
  }

  public componentDidUpdate(prevProps: IScrollablePaneProps, prevState: IScrollablePaneState) {
    const initialScrollPosition = this.props.initialScrollPosition;
    if (this.contentContainer && typeof initialScrollPosition === 'number' && prevProps.initialScrollPosition !== initialScrollPosition) {
      this.contentContainer.scrollTop = initialScrollPosition;
    }

    // Update subscribers when stickyTopHeight/stickyBottomHeight changes
    if (prevState.stickyTopHeight !== this.state.stickyTopHeight || prevState.stickyBottomHeight !== this.state.stickyBottomHeight) {
      this.notifySubscribers();
    }

    this._async.setTimeout(this._onWindowResize, 0);
  }

  public render(): JSX.Element {
    const { className, theme, styles, experimentalLayoutImprovements } = this.props;
    const { stickyTopHeight, stickyBottomHeight } = this.state;
    const classNames = getClassNames(styles!, {
      theme: theme!,
      className,
      scrollbarVisibility: this.props.scrollbarVisibility,
      experimentalLayoutImprovements: !!experimentalLayoutImprovements
    });

    return (
      <div {...getNativeProps(this.props, divProperties)} ref={this._root} className={classNames.root}>
        <div ref={this._contentContainer} className={classNames.contentContainer} data-is-scrollable={true}>
          <ScrollablePaneContext.Provider value={this._getScrollablePaneContext()}>{this.props.children}</ScrollablePaneContext.Provider>
        </div>
        <div ref={this._stickyAboveRef} className={classNames.stickyAbove} style={this._getStickyContainerStyle(stickyTopHeight, true)} />
        <div className={classNames.stickyBelow} style={this._getStickyContainerStyle(stickyBottomHeight, false)}>
          <div ref={this._stickyBelowRef} className={classNames.stickyBelowItems} />
        </div>
      </div>
    );
  }

  public setStickiesDistanceFromTop(): void {
    if (this.contentContainer) {
      this._stickies.forEach(sticky => {
        sticky.setDistanceFromTop(this.contentContainer as HTMLDivElement);
      });
    }
  }

  public forceLayoutUpdate() {
    this._onWindowResize();
  }

  public subscribe = (handler: Function): void => {
    this._subscribers.add(handler);
  };

  public unsubscribe = (handler: Function): void => {
    this._subscribers.delete(handler);
  };

  public addSticky = (sticky: Sticky): void => {
    this._stickies.add(sticky);

    // If ScrollablePane is mounted, then sort sticky in correct place
    if (this.contentContainer) {
      if (sticky.canStickyBottom && this.optimizeForPerformance()) {
        sticky.setState({
          /**
           * must set distanceFromTop to add stickyContent Ref to stickyContainer in sorted order.
           */
          distanceFromTop: 0,
          /**
           * must set isStickyBottom to place nonStickyContent as a child of stickyContent Ref.
           */
          isStickyBottom: true,

          isStickyTop: false
        });
      } else {
        sticky.setDistanceFromTop(this.contentContainer);
        this.sortSticky(sticky);
      }
    }
    /**
     * else {
     *    ScrollablePane is yet to be mounted
     *    when scrollablePane mounts, it calls notifySubscribers() which
     *    1. sets distanceFromTop to add stickyContent Ref to stickyContainer in sorted order.
     *    2. sets isStickyTop or isStickyBottom to place nonStickyContent as a child of stickyContent Ref.
     *
     * }
     */
  };

  public removeSticky = (sticky: Sticky): void => {
    this._stickies.delete(sticky);
    this._removeStickyFromContainers(sticky);
    this.notifySubscribers();
  };

  public sortSticky = (sticky: Sticky, sortAgain?: boolean): void => {
    /**
     * When is sorting needed?
     * 1. sticky is not a part of stickyContainer (or to be added first time)
     * 2. it is a part of stickyContainer but not sorted based on order
     */

    const isPartOfStickyAboveContainer =
      sticky.canStickyTop && this._stickyContainerContainsStickyContent(sticky, StickyPositionType.Header);
    const isPartOfStickyBelowContainer =
      sticky.canStickyBottom && this._stickyContainerContainsStickyContent(sticky, StickyPositionType.Footer);
    const isPartOfStickyContainer = sticky.props.stickyPosition
      ? isPartOfStickyAboveContainer !== isPartOfStickyBelowContainer
      : isPartOfStickyAboveContainer && isPartOfStickyBelowContainer;
    if (isPartOfStickyContainer && this.optimizeForPerformance()) {
      /**
       * already sorted based on order
       */
      return;
    }
    if (this.stickyAbove && this.stickyBelow) {
      if (sortAgain) {
        this._removeStickyFromContainers(sticky);
      }
      if (sticky.canStickyTop && sticky.stickyContentTop) {
        this._addToStickyContainer(sticky, this.stickyAbove, sticky.stickyContentTop);
      }

      if (sticky.canStickyBottom && sticky.stickyContentBottom) {
        this._addToStickyContainer(sticky, this.stickyBelow, sticky.stickyContentBottom);
      }
    }
  };

  public updateStickyRefHeights = (): void => {
    // for optimization, placeholder is not used.
    const placeholderUsedForStickyContent = !this.optimizeForPerformance();
    if (!placeholderUsedForStickyContent) {
      return;
    }
    const stickyItems = this._stickies;

    let stickyTopHeight = 0;
    let stickyBottomHeight = 0;

    stickyItems.forEach((sticky: Sticky) => {
      const { isStickyTop, isStickyBottom } = sticky.state;
      if (sticky.nonStickyContent) {
        if (isStickyTop) {
          stickyTopHeight += sticky.nonStickyContent.offsetHeight;
        }
        if (isStickyBottom) {
          stickyBottomHeight += sticky.nonStickyContent.offsetHeight;
        }
        this._checkStickyStatus(sticky);
      }
    });

    this.setState({
      stickyTopHeight: stickyTopHeight,
      stickyBottomHeight: stickyBottomHeight
    });
  };

  public notifySubscribers = (): void => {
    if (this.contentContainer) {
      this._subscribers.forEach(handle => {
        // this.stickyBelow is passed in for calculating distance to determine Sticky status
        handle(this.contentContainer, this.stickyBelow);
      });
    }
  };

  public getScrollPosition = (): number => {
    if (this.contentContainer) {
      return this.contentContainer.scrollTop;
    }

    return 0;
  };

  public syncScrollSticky = (sticky: Sticky): void => {
    if (sticky && this.contentContainer) {
      sticky.syncScroll(this.contentContainer);
    }
  };

  public optimizeForPerformance = (): boolean => {
    return !!this.props.experimentalLayoutImprovements;
  };

  public getUserInteractionStatus = (): boolean => {
    return this._userHasInteracted;
  };

  public getHorizontalScrollPosition = (): number => {
    const { contentContainer } = this;
    return this.optimizeForPerformance() ? this._scrollLeft : (contentContainer && contentContainer.scrollLeft) || 0;
  };

  private _getScrollablePaneContext = (): IScrollablePaneContext => {
    return {
      scrollablePane: {
        subscribe: this.subscribe,
        unsubscribe: this.unsubscribe,
        addSticky: this.addSticky,
        removeSticky: this.removeSticky,
        updateStickyRefHeights: this.updateStickyRefHeights,
        sortSticky: this.sortSticky,
        notifySubscribers: this.notifySubscribers,
        syncScrollSticky: this.syncScrollSticky,
        getHorizontalScrollPosition: this.getHorizontalScrollPosition,
        optimizeForPerformace: this.optimizeForPerformance,
        getUserInteractionStatus: this.getUserInteractionStatus
      }
    };
  };

  private _stickyContainerContainsStickyContent(sticky: Sticky, stickyPositionType: StickyPositionType): boolean {
    return stickyPositionType === StickyPositionType.Header
      ? !!this.stickyAbove && !!sticky.stickyContentTop && this.stickyAbove.contains(sticky.stickyContentTop)
      : !!this.stickyBelow && !!sticky.stickyContentBottom && this.stickyBelow.contains(sticky.stickyContentBottom);
  }

  private _checkStickyStatus(sticky: Sticky): void {
    if (this.stickyAbove && this.stickyBelow && this.contentContainer && sticky.nonStickyContent) {
      // If sticky is sticky, then append content to appropriate container
      if (sticky.state.isStickyTop || sticky.state.isStickyBottom) {
        if (sticky.state.isStickyTop && !this.stickyAbove.contains(sticky.nonStickyContent) && sticky.stickyContentTop) {
          sticky.addSticky(sticky.stickyContentTop);
        }

        if (sticky.state.isStickyBottom && !this.stickyBelow.contains(sticky.nonStickyContent) && sticky.stickyContentBottom) {
          sticky.addSticky(sticky.stickyContentBottom);
        }
      } else if (!this.contentContainer.contains(sticky.nonStickyContent)) {
        // Reset sticky if it's not sticky and not in the contentContainer element
        sticky.resetSticky();
      }
    }
  }

  private _addToStickyContainer = (sticky: Sticky, stickyContainer: HTMLDivElement, stickyContentToAdd: HTMLDivElement): void => {
    // If there's no children, append child to list, otherwise, sort though array and append at correct position
    if (!stickyContainer.children.length) {
      stickyContainer.appendChild(stickyContentToAdd);
    } else {
      // If stickyContentToAdd isn't a child element of target container, then append
      if (!stickyContainer.contains(stickyContentToAdd)) {
        const stickyChildrenElements: Element[] = [].slice.call(stickyContainer.children);

        const stickyList: Sticky[] = [];
        const isStickyAboveContainer: boolean = stickyContainer === this.stickyAbove;
        // Get stickies.  Filter by canStickyTop/Bottom, then sort by distance from top, and then
        // filter by elements that are in the stickyContainer already.
        this._stickies.forEach(stickyItem => {
          if (isStickyAboveContainer && sticky.canStickyTop) {
            stickyList.push(stickyItem);
          } else if (sticky.canStickyBottom) {
            stickyList.push(stickyItem);
          }
        });

        const stickyListSorted = stickyList
          .sort((a, b) => {
            return this.optimizeForPerformance()
              ? (a.props.order || 0) - (b.props.order || 0)
              : (a.state.distanceFromTop || 0) - (b.state.distanceFromTop || 0);
          })
          .filter(item => {
            const stickyContent = isStickyAboveContainer ? item.stickyContentTop : item.stickyContentBottom;
            if (stickyContent) {
              return stickyChildrenElements.indexOf(stickyContent) > -1;
            }
          });

        // Get first element that has a distance from top that is further than our sticky that is being added
        let targetStickyToAppendBefore: Sticky | undefined = undefined;
        for (const i in stickyListSorted) {
          if (
            this.optimizeForPerformance()
              ? (stickyListSorted[i].props.order || 0) >= (sticky.props.order || 0)
              : (stickyListSorted[i].state.distanceFromTop || 0) >= (sticky.state.distanceFromTop || 0)
          ) {
            targetStickyToAppendBefore = stickyListSorted[i];
            break;
          }
        }

        // If target element to append before is known, then grab respective stickyContentTop/Bottom element and insert before
        let targetContainer: HTMLDivElement | null = null;
        if (targetStickyToAppendBefore) {
          targetContainer =
            stickyContainer === this.stickyAbove
              ? targetStickyToAppendBefore.stickyContentTop
              : targetStickyToAppendBefore.stickyContentBottom;
        }
        stickyContainer.insertBefore(stickyContentToAdd, targetContainer);
      }
    }
  };

  private _removeStickyFromContainers = (sticky: Sticky): void => {
    if (this._stickyContainerContainsStickyContent(sticky, StickyPositionType.Header)) {
      this.stickyAbove!.removeChild(sticky.stickyContentTop!);
    }
    if (this._stickyContainerContainsStickyContent(sticky, StickyPositionType.Footer)) {
      this.stickyBelow!.removeChild(sticky.stickyContentBottom!);
    }
  };

  private _onWindowResize = (): void => {
    const scrollbarWidth = this._getScrollbarWidth();
    const scrollbarHeight = this._getScrollbarHeight();

    this.setState({
      scrollbarWidth,
      scrollbarHeight
    });

    this.notifySubscribers();
  };

  private _getStickyContainerStyle = (height: number, isTop: boolean): React.CSSProperties => {
    return {
      ...(this.optimizeForPerformance() ? {} : { height: height }),
      ...(getRTL()
        ? {
            right: '0',
            left: `${this.state.scrollbarWidth || this._getScrollbarWidth() || 0}px`
          }
        : {
            left: '0',
            right: `${this.state.scrollbarWidth || this._getScrollbarWidth() || 0}px`
          }),
      ...(isTop
        ? {
            top: '0'
          }
        : {
            bottom: `${this.state.scrollbarHeight || this._getScrollbarHeight() || 0}px`
          })
    };
  };

  /**
   * It returns width of vertical scrollbar
   */
  private _getScrollbarWidth(): number {
    return _getScrollbarHeightOrWidth(
      this.contentContainer,
      this.props.scrollbarVisibility === ScrollbarVisibility.always,
      false /** reading scrollbar width */,
      this.props.storeScrollbarWidth,
      this.props.readScrollbarWidth
    );
  }

  /**
   * It returns height of horizontal scrollbar
   */
  private _getScrollbarHeight(): number {
    return _getScrollbarHeightOrWidth(
      this.contentContainer,
      this.props.scrollbarVisibility === ScrollbarVisibility.always,
      true /** reading scrollbar height */,
      this.props.storeScrollbarHeight,
      this.props.readScrollbarHeight
    );
  }

  private _onScroll = () => {
    const { contentContainer } = this;

    if (contentContainer) {
      this._userHasInteracted = true;
      this._scrollLeft = contentContainer.scrollLeft;
      this._stickies.forEach((sticky: Sticky) => {
        sticky.syncScroll(contentContainer);
      });
    }

    this._notifyThrottled();
  };
}

function _getScrollbarHeightOrWidthForContainer(contentContainer: HTMLDivElement | null, readHeight?: boolean): number {
  if (!contentContainer) {
    return 0;
  }
  return readHeight
    ? contentContainer.offsetHeight - contentContainer.clientHeight
    : contentContainer.offsetWidth - contentContainer.clientWidth;
}

function _getScrollbarHeightOrWidth(
  contentContainer: HTMLDivElement | null,
  isScrollbarVisibilityAlways: boolean,
  readHeight: boolean,
  storeScrollbarSize?: (scrollbarsize: number) => void,
  getScrollbarSize?: () => number
): number {
  if (!isScrollbarVisibilityAlways) {
    return _getScrollbarHeightOrWidthForContainer(contentContainer, readHeight);
  }
  let scrollbarSize = getScrollbarSize ? getScrollbarSize() : 0;
  if (!scrollbarSize) {
    /**
     * Scrollbar is visible but it's height/width has not been calculated yet.
     */
    scrollbarSize = _getScrollbarHeightOrWidthForContainer(contentContainer, readHeight);
    // store it
    storeScrollbarSize && storeScrollbarSize(scrollbarSize);
  }
  return scrollbarSize;
}
