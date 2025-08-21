// Polyfills for Node.js modules in React Native
import { Buffer } from 'buffer';
import process from 'process';

global.Buffer = Buffer;
global.process = process;

import 'expo-router/entry';
