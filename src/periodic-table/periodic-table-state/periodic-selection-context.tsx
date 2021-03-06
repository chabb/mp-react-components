import * as React from "react";
import { getPeriodicSelectionStore, PeriodicSelectionContext } from "./table-store";
import { useMemo } from "react";

export function PeriodicContext(props: any) {
  // We consider that the store will never change once the element is mounted
  const store = useMemo(() => getPeriodicSelectionStore(), []);

  return (<PeriodicSelectionContext.Provider value={store}>
    {{...props.children}}
  </PeriodicSelectionContext.Provider>)
}
