import DevTools from './DevTools';
import Core from './plugins/CorePlugin';
import ViewHierarchy from './plugins/ViewHierarchyPlugin';

const plugins = [
  Core,
  ViewHierarchy
];

const devTools = new DevTools({ plugins });

export default devTools;
