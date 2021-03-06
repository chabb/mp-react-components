import * as React from 'react';
import { useElements } from './periodic-table-state/table-store';
import { Table, TableLayout } from './periodic-table-component/periodic-table.component';
import { useEffect } from 'react';
import { arrayToDictionnary } from '../utils/utils';

interface SelectableTableProps {
  /** array of enabled elements, e.g : ['H', 'O'] */
  enabledElements: string[];
  /** array of disabled elements, e.g : ['H', 'O'] */
  disabledElements: string[];
  /** array of hidden elements, e.g : ['H', 'O'] */
  hiddenElements: string[];
  /** prevent user to select more than N elements */
  maxElementSelectable: number;
  /** callback called with an array of selected elements */
  onStateChange?: (selected: string[]) => void;
  /** whether to force a particular layout */
  forceTableLayout?: TableLayout;
  /** wheter to forward non-managed changes */
  forwardOuterChange?: boolean;
}

export function SelectableTable(props: SelectableTableProps) {
  // TOOD(chab) explore the other way, have three different subscriptions with distinctUntilChanged
  // memoize those 3 values
  const { tableStateStore, disabledEls, hiddenEls, enabledEls } = useElementsWithState(props);

  return (
    <Table
      onElementClicked={element => tableStateStore.toggleEnabledElement(element.symbol)}
      onElementHovered={element => tableStateStore.setDetailedElement(element.symbol)}
      forceTableLayout={props.forceTableLayout}
      disabledElement={disabledEls}
      hiddenElement={hiddenEls}
      enabledElement={enabledEls}
      {...props}
    />
  );
}

const useElementsWithState = (props: SelectableTableProps) => {
  // could be memoized
  const els = arrayToDictionnary(props.enabledElements);
  const dls = arrayToDictionnary(props.disabledElements);
  const hiddenElements = arrayToDictionnary(props.hiddenElements);

  const {
    enabledElements: enabledEls,
    disabledElements: disabledEls,
    hiddenElements: hiddenEls,
    actions: tableStateStore
  } = useElements(dls, els, hiddenElements, props.maxElementSelectable, props.onStateChange);

  useEffect(() => {
    tableStateStore.setForwardChange(props.forwardOuterChange);
  }, [props.forwardOuterChange]);

  useEffect(() => {
    //console.log("[Scomponent updated, e");
    tableStateStore.setEnabledElements(els);
  }, [props.enabledElements]); // TODO, add test -> i set that to forwardOuterChange by mistake, it was not caught by test
  useEffect(() => {
    //console.log("[Scomponent updated, d");
    tableStateStore.setDisabledElements(dls);
  }, [props.disabledElements]);
  useEffect(() => {
    //console.log("[Scomponent updated, h");
    tableStateStore.setHiddenElements(hiddenElements);
  }, [props.hiddenElements]);
  useEffect(() => {
    //TODO(chab) let's suppose this change on the fly, we might need to deselect all the extraneous element
    tableStateStore.setMaxSelectionLimit(props.maxElementSelectable);
  }, [props.maxElementSelectable]);

  return {
    tableStateStore,
    enabledEls,
    disabledEls,
    hiddenEls
  };
};
