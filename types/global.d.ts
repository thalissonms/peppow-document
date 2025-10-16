declare module "*.css";

// CKEditor CDN fallback typings
declare global {
	interface Window {
		ClassicEditor?: {
			create: (element: HTMLElement, config?: import("@ckeditor/ckeditor5-core").EditorConfig) => Promise<import("@ckeditor/ckeditor5-core").Editor>;
		};
	}
}

export {};
