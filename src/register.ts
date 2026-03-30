// https://nodejs.org/api/module.html#moduleregisterspecifier-parenturl-options
import { register } from 'node:module';

register('./hooks.mjs', import.meta.url);
