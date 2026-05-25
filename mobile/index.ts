import { registerRootComponent } from 'expo';

// Import GPS task file first so TaskManager.defineTask runs before app registers
import './src/lib/gps';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
