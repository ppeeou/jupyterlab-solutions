import { ICellTools, INotebookTracker } from "@jupyterlab/notebook";
import { DisposableDelegate } from '@phosphor/disposable';
import { ToolbarButton } from '@jupyterlab/apputils';
import { PageConfig } from '@jupyterlab/coreutils'
import "../style/index.css";

class RmotrToolbarButtons {
  constructor(notebookTracker) {
    this.notebookTracker = notebookTracker;
  }

  createNew(panel, context) {
    const getButton = type => {
      let icon = type === 'solution' ? 'graduation-cap' : 'lightbulb-o';
      
      let handleClick = () => {
        const activeCell = this.notebookTracker.activeCell;
  
        toggleCellType(activeCell, type, false, true);
      }

      return (
        new ToolbarButton({
          className: `${type}-button`,
          label: `Mark as ${type}`,
          iconClassName: `fa fa-${icon}`,
          onClick: handleClick,
          tooltip: `Mark current cell as ${type}`
        })
      )
    }

    panel.toolbar.insertItem(10, 'SolutionButton', getButton('solution'));
    panel.toolbar.insertItem(10, 'HintButton', getButton('hint'));
  }
}

const createCellHeader = (cell, type, isFirstLoad, isTeacher) => {
  var cellHeaderDiv = document.createElement('div');
  cellHeaderDiv.className = 'rmotr-cellHeaderContainer';
  cellHeaderDiv.innerHTML = `<p class="rmotr-cellHeaderText"><span>${type}</span> block</p>`;
  if (!isTeacher) cellHeaderDiv.innerHTML += `<button class="rmotr-toggleCellHeaderButton">Hide ${type}</button>`;

  var cellHeader = cell.node.getElementsByClassName('jp-CellHeader')[0];
  cellHeader.appendChild(cellHeaderDiv);

  if (!isTeacher) {
    var cellHeaderButton = cell.node.getElementsByClassName('rmotr-toggleCellHeaderButton')[0];
    cell.inputArea.hide();
    cellHeaderButton.innerHTML = `Reveal ${type}`;

    cellHeaderButton.addEventListener('click', (evt) => {
      const isCollapsed = cell.inputArea.isHidden

      if (isCollapsed) {
        cell.inputArea.show();
        cellHeaderButton.innerHTML = `Hide ${type}`;
      } else {
        cell.inputArea.hide();
        cellHeaderButton.innerHTML = `Reveal ${type}`;
      }
    });
  } else {
    cell.inputArea.show();
  }
}

const toggleCellType = (cell, type, isFirstLoad, isTeacher) => {
  const { model } = cell;
  const { metadata } = model;
  let currentValue = metadata.get('cell_type');
  let newValue = currentValue;

  // TO BE DEPRECATED, used to have retrocompability to version <0.0.6
  const OLD_IS_SOLUTION = metadata.get('is_solution');
  if (OLD_IS_SOLUTION !== undefined) {
    metadata.delete('is_solution');

    if (OLD_IS_SOLUTION) {
      currentValue = 'solution';
      metadata.set('cell_type', 'solution');
    }
  }

  // update cell metadata and class with new value if toggle button was clicked
  if (!isFirstLoad) {
    switch (true) {
      case type === 'solution' && currentValue !== 'solution':
        newValue = type;
        metadata.set('cell_type', type);
        cell.addClass('rmotr-cell-is-solution');
        cell.removeClass(`rmotr-cell-is-${currentValue}`);
        break;
      case type === 'hint' && currentValue !== 'hint':
        newValue = type;
        metadata.set('cell_type', type);
        cell.addClass('rmotr-cell-is-hint');
        cell.removeClass(`rmotr-cell-is-${currentValue}`);
        break;
      case currentValue === type:
      default:
        metadata.delete('cell_type');
        cell.removeClass(`rmotr-cell-is-${currentValue}`);
    }
  } else {
    cell.addClass(`rmotr-cell-is-${currentValue}`);
  }

  // first time element is marked
  var cellHeaderDiv = cell.node.getElementsByClassName('rmotr-cellHeaderContainer')[0];
  if (cellHeaderDiv) {
    // remove it
    cellHeaderDiv.remove();
  }

  // create a new cell header
  if (newValue) createCellHeader(cell, newValue, isFirstLoad, isTeacher);
}

/**
 * Initialization data for the jupyterlab_rmotr_solutions extension.
 */
const activate = (app, cellTools, notebookTracker) => {
  console.log('>>> JupyterLab extension jupyterlab_rmotr_solutions (beta) is activated!');

  let isEnabled = true;
  let isTeacher = false;

  fetch(`${PageConfig.getBaseUrl()}rmotr-solutions`)
  .then(res => res.json())
  .then(res => {
    isEnabled = res.is_enabled;
    isTeacher = res.role !== 'teacher';

    if (isEnabled) {
      if (isTeacher) {
        // add buttons on toolbar
        app.docRegistry.addWidgetExtension('Notebook', new RmotrToolbarButtons(notebookTracker));
      }

      // update cells type
      notebookTracker.widgetAdded.connect(() => {
        console.log('widget added', notebookTracker)
        const { currentWidget } = notebookTracker;

        currentWidget.revealed.then(() => {
          const { content } = currentWidget;

          content.widgets.forEach(cell => {
            toggleCellType(cell, false, true, isTeacher);
          })
        })
      })
    }
  });
}

const extension = {
  id: "jupyterlab_rmotr_solutions",
  autoStart: true,
  requires: [ICellTools, INotebookTracker],
  activate: activate
};

export default extension;