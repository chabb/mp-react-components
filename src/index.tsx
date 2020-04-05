/**
 *
 *  App bootstrapping. See index.html
 *
 */
import * as React from 'react';
import { useState } from 'react';
import * as ReactDOM from 'react-dom';
import './styles.less';
import { SelectableTable } from './periodic-table/table-state';
import { TableFilter } from './periodic-table/periodic-filter/table-filter';
import { StandalonePeriodicComponent } from './periodic-table/periodic-element/standalone-periodic-component';
import { useElements } from './periodic-table/periodic-table-state/table-store';
import { PeriodicContext } from './periodic-table/periodic-table-state/periodic-selection-context';
import { TableLayout } from './periodic-table/periodic-table-component/periodic-table.component';
import {
  s2 as scene,
  shperes as scene2,
  s4 as scene3,
  buggyScene
} from './crystal-toolkit-components/components-v2/scene/simple-scene';
import Simple3DSceneComponent from './crystal-toolkit-components/components-v2/Simple3DScene/Simple3DSceneComponent.react';
import { CameraContextWrapper } from './crystal-toolkit-components/components-v2/Simple3DScene/camera-context';
import { Renderer } from './crystal-toolkit-components/components-v2/Simple3DScene/constants';
import { SceneEditor } from './crystal-toolkit-components/components-v2/Simple3DScene/scene-editor/Simple3DSceneEditorComponent.react';
import { TABLE_DICO_CLASS } from './periodic-table/periodic-table-data/table';
import { TABLE_DICO_V2 } from './periodic-table/periodic-table-data/table-v2';

const mountNodeSelector = 'app';
const mountNode = document.getElementById(mountNodeSelector);

let elements: any[] = [];

const vis = { atoms: true };

function SceneSwitcher() {
  const [_scene, setScene] = useState(scene) as any;

  return (
    <div>
      <SceneEditor
        sceneSize={500}
        settings={{
          renderer: Renderer.WEBGL,
          extractAxis: false,
          isMultiSelectionEnabled: true,
          secondaryObjectView: true
        }}
        data={_scene}
        debug={false}
      />
    </div>
  );
}

function SelectedComponentSimple() {
  const { enabledElements } = useElements();
  // try to delete the key in the store instead
  const getElementsList = () => Object.keys(enabledElements).filter(el => enabledElements[el]);
  return (
    <ul>
      {getElementsList().map(el => (
        <li key={el}>{el}</li>
      ))}
    </ul>
  );
}
const keys = new Set([...Object.keys(TABLE_DICO_V2)]);
keys.delete('Pb');
keys.delete('Na');

ReactDOM.render(
  <>
    <SceneSwitcher />
    <PeriodicContext>
      <SelectableTable
        maxElementSelectable={2}
        forceTableLayout={TableLayout.MINI}
        enabledElements={[]}
        disabledElements={Array.from(keys)}
        hiddenElements={[]}
      />
    </PeriodicContext>
    {/*<CameraContextWrapper>
      <>
        <Simple3DSceneComponent
          settings={{ renderer: Renderer.WEBGL, extractAxis: false }}
          data={scene}
          debug={true}
          toggleVisibility={{}}
        />
        <Simple3DSceneComponent
          settings={{ renderer: Renderer.WEBGL, extractAxis: true }}
          data={scene2}
          debug={false}
          toggleVisibility={{}}
        />
        <Simple3DSceneComponent data={scene3} debug={false} toggleVisibility={{}} />
      </>
    </CameraContextWrapper>*/}

    {/*<div>
      {<TestComponent d={['B']} b={[]} e={[]} />}
      {
        <PeriodicContext>
          <div>
            <div>
              <SelectableTable
                maxElementSelectable={2}
                forceTableLayout={TableLayout.COMPACT}
                hiddenElements={[]}
                onStateChange={enabledElements => {
                  elements = Object.keys(enabledElements).filter(el => enabledElements[el]);
                }}
                enabledElements={[]}
                disabledElements={['H', 'C']}
              />
              <TableFilter />
              <SelectableTable
                maxElementSelectable={1}
                forceTableLayout={TableLayout.MAP}
                enabledElements={['H', 'C']}
                disabledElements={[]}
                hiddenElements={[]}
              />
            </div>
            <SelectedComponentSimple />
          </div>
        </PeriodicContext>
      }
    </div>*/}
  </>,

  mountNode
);
console.log('RUNNING in', process.env.NODE_ENV, 'DEBUGGING IS', process.env.DEBUG);
