import { mount } from 'svelte';
import './ui/adw/index.css';
import App from './App.svelte';
import { initTheme } from './ui/theme';

initTheme();
mount(App, { target: document.getElementById('app')! });
