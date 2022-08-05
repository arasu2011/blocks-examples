import { syntaxTree } from "@codemirror/language";
import { Range, RangeSet } from "@codemirror/rangeset";
import { EditorState, Extension, StateField } from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  WidgetType,
} from "@codemirror/view";

interface ImageWidgetParams {
  url: string;
}

class ImageWidget extends WidgetType {
  readonly url;

  constructor({ url }: ImageWidgetParams) {
    super();

    this.url = url;
  }

  eq(imageWidget: ImageWidget) {
    return imageWidget.url === this.url;
  }

  toDOM() {
    const container = document.createElement("div");
    const backdrop = container.appendChild(document.createElement("div"));
    const figure = backdrop.appendChild(document.createElement("figure"));
    const image = figure.appendChild(document.createElement("img"));

    container.setAttribute("aria-hidden", "true");
    container.className = "cm-image-container";
    backdrop.className = "cm-image-backdrop";
    figure.className = "cm-image-figure";
    image.className = "cm-image-img";
    image.src = this.url;

    container.style.paddingBottom = "0.5rem";
    container.style.paddingTop = "0.5rem";

    backdrop.classList.add("cm-image-backdrop");

    backdrop.style.borderRadius = "var(--ink-internal-all-border-radius)";
    backdrop.style.display = "flex";
    // backdrop.style.alignItems = 'center'
    // backdrop.style.justifyContent = 'center'
    backdrop.style.overflow = "hidden";
    backdrop.style.maxWidth = "100%";

    figure.style.margin = "0";

    image.style.display = "block";
    image.style.maxHeight = "var(--ink-internal-block-max-height)";
    image.style.maxWidth = "100%";
    image.style.width = "100%";

    return container;
  }

  ignoreEvent(_event: Event): boolean {
    return false;
  }
}

export const images = (): Extension => {
  const imageRegex = /!\[(?<alt>.*?)\]\((?<url>.*?)\)/;
  const imageRegexHtml = /<img.*?src="(?<url>.*?)".*?alt="(?<alt>.*?)".*?>/;

  const imageDecoration = (imageWidgetParams: ImageWidgetParams) =>
    Decoration.widget({
      widget: new ImageWidget(imageWidgetParams),
      side: 1,
      block: true,
      class: "image",
    });

  const imageTextDecoration = (alt: string) =>
    Decoration.mark({
      class: "cm-image",
      attributes: {
        title: alt,
      },
    });

  const decorate = (state: EditorState) => {
    const widgets: Range<Decoration>[] = [];

    syntaxTree(state).iterate({
      enter: (type, from, to) => {
        if (type.name === "Image") {
          const result = imageRegex.exec(state.doc.sliceString(from, to));

          if (result && result.groups && result.groups.url) {
            widgets.push(
              imageDecoration({ url: result.groups.url }).range(
                state.doc.lineAt(from).from
              )
            );
            widgets.push(
              imageTextDecoration(result.groups.alt || result.groups.url).range(
                state.doc.lineAt(from).from,
                state.doc.lineAt(to).to
              )
            );
          }
        } else if (type.name === "HTMLBlock") {
          const result = imageRegexHtml.exec(state.doc.sliceString(from, to));

          if (result && result.groups && result.groups.url) {
            widgets.push(
              imageDecoration({ url: result.groups.url }).range(
                state.doc.lineAt(from).from
              )
            );
            console.log(result);
            widgets.push(
              imageTextDecoration(result.groups.alt || result.groups.url).range(
                state.doc.lineAt(from).from,
                state.doc.lineAt(to).to
              )
            );
          }
        }
      },
    });

    return widgets.length > 0 ? RangeSet.of(widgets) : Decoration.none;
  };

  const imagesTheme = EditorView.baseTheme({
    ".cm-image-backdrop": {
      backgroundColor: "var(--ink-internal-block-background-color)",
    },
  });

  const imagesField = StateField.define<DecorationSet>({
    create(state) {
      return decorate(state);
    },
    update(images, transaction) {
      // taking out restrictions for now,
      // it wasn't updating outside of the active scroll window
      // if (transaction.docChanged) {
      return decorate(transaction.state);
      // }

      // return images.map(transaction.changes);
    },
    provide(field) {
      return EditorView.decorations.from(field);
    },
  });

  return [imagesTheme, imagesField];
};
