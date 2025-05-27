import adapter from '@sveltejs/adapter-static';
import autoprefixer from 'autoprefixer';
import { sveltePreprocess } from 'svelte-preprocess';

const config = {
	preprocess: sveltePreprocess({
		postcss: {
			plugins: [autoprefixer]
		}
	}),
	kit: {
		adapter: adapter(),
		files: {
			assets: 'src/frontend/static',
			lib: 'src/frontend/src/lib',
			routes: 'src/frontend/src/routes',
			appTemplate: 'src/frontend/src/app.html',
		},
		prerender: {
			entries: [] // Disable prerendering by providing empty entries
		}
	},
};
export default config;
