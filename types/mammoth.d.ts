declare module "mammoth" {
  export interface MammothMessage {
    type: string;
    message: string;
  }

  export interface HtmlResult {
    value: string;
    messages: ReadonlyArray<MammothMessage>;
  }

  export interface Image {
    contentType: string;
    read: (encoding: "base64" | "binary") => Promise<string>;
  }

  export interface ImageTransformation {
    src: string;
    altText?: string;
  }

  export type ImageConverter = (image: Image) => Promise<ImageTransformation>;

  export namespace images {
    function inline(transform: ImageConverter): ImageConverter;
  }

  export interface ConvertToHtmlOptions {
    convertImage?: ImageConverter;
    styleMap?: string[];
    includeDefaultStyleMap?: boolean;
  }

  export function convertToHtml(
    input: { path: string } | { arrayBuffer: ArrayBuffer },
    options?: ConvertToHtmlOptions
  ): Promise<HtmlResult>;

  const mammoth: {
    convertToHtml: typeof convertToHtml;
    images: typeof images;
  };

  export default mammoth;
}
