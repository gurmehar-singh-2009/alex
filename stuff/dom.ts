// stupid dom stuff ewwww ew ewe we wew ew e eww ewew ewew ew ew EWWWW

export type Child = Element<any> | Node | string | number | boolean | null | undefined | Child[];

export type Props = {
  class?: string | string[];
  text?: string | number;
  html?: string;
  style?: Partial<CSSStyleDeclaration> | string;
  data?: Record<string, string | number | boolean>;
  [key: string]: unknown;
};

type Handler<K extends string> = (e: K extends keyof HTMLElementEventMap ? HTMLElementEventMap[K] : Event) => void;

// basically you can do stuff like h.div(loggedIn && h.p("hi"))
function toNodes(stuff: Child[]): Node[] {
  let out: Node[] = [];

  for (let thing of (stuff as unknown[]).flat(Infinity)) {
    if (thing == null || typeof thing === "boolean") continue;

    if (thing instanceof Element) {
      out.push(thing.raw);
    } else if (thing instanceof Node) {
      out.push(thing);
    } else {
      out.push(document.createTextNode(String(thing)));
    }
  }

  return out;
}

function isProps(x: unknown): x is Props {
  return typeof x === "object" && x !== null && !Array.isArray(x) && !(x instanceof Node) && !(x instanceof Element);
}

function splitNames(names: string[]): string[] {
  return names.flatMap((n) => n.split(" ")).filter(Boolean);
}

export class Element<T extends HTMLElement = HTMLElement> {
  private element: T;
  private oldDisplay = "";

  // so we can get from a raw dom node back to its elm
  private static wrappers = new WeakMap<HTMLElement, Element<any>>();

  // allow Element("p", "wow!") as well as Element("div", other_element)
  constructor(tag: string | T = "div", props?: Props | Child, ...children: Child[]) {
    this.element = (typeof tag === "string" ? document.createElement(tag) : tag) as T;
    Element.wrappers.set(this.element, this);

    if (props != null && !isProps(props)) {
      children.unshift(props);
      props = undefined;
    }

    if (props) this.set(props);
    this.add(...children);
  }

  // like the constructor but knows what kind of element you get back
  static create<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    props?: Props | Child,
    ...children: Child[]
  ): Element<HTMLElementTagNameMap[K]> {
    return new Element<HTMLElementTagNameMap[K]>(tag, props, ...children);
  }

  // wrap something that's already in the dom
  static from<E extends HTMLElement>(el: E): Element<E> {
    return (Element.wrappers.get(el) as Element<E> | undefined) ?? new Element<E>(el);
  }

  // the actual dom node
  public get raw(): T {
    return this.element;
  }

  public get children(): Element[] {
    return Array.from(this.element.children).map((c) => Element.from(c as HTMLElement));
  }

  public get parent(): Element | null {
    let p = this.element.parentElement;
    return p ? Element.from(p) : null;
  }

  public set(props: Props): this;
  public set(key: string, val: unknown): this;
  public set(key: string | Props, val?: unknown): this {
    if (typeof key === "object") {
      for (let k in key) this.set(k, key[k]);
      return this;
    }

    if (key === "class") {
      this.element.className = Array.isArray(val) ? val.join(" ") : String(val);
    } else if (key === "text") {
      this.element.textContent = String(val);
    } else if (key === "html") {
      this.element.innerHTML = String(val);
    } else if (key === "style") {
      if (typeof val === "object" && val !== null) Object.assign(this.element.style, val);
      else this.element.style.cssText = String(val);
    } else if (key === "data" && typeof val === "object" && val !== null) {
      for (let [k, v] of Object.entries(val)) this.element.dataset[k] = String(v);
    } else if (key === "for") {
      this.element.setAttribute("for", String(val));
    } else if (key.startsWith("on") && typeof val === "function") {
      this.element.addEventListener(key.slice(2).toLowerCase(), val as EventListener);
    } else if (key in this.element) {
      try {
        (this.element as any)[key] = val;
      } catch {
        // some props are readonly (list, form, etc) so use the attribute instead
        this.element.setAttribute(key, String(val));
      }
    } else if (val === false || val == null) {
      this.element.removeAttribute(key);
    } else {
      this.element.setAttribute(key, val === true ? "" : String(val));
    }

    return this;
  }

  public get(key: string): string | null {
    return this.element.getAttribute(key);
  }

  public unset(...keys: string[]): this {
    for (let k of keys) this.element.removeAttribute(k);

    return this;
  }

  public data(key: string): string | undefined;
  public data(key: string, val: string | number | boolean): this;
  public data(key: string, val?: string | number | boolean): string | undefined | this {
    if (val === undefined) return this.element.dataset[key];
    this.element.dataset[key] = String(val);

    return this;
  }

  public text(): string;
  public text(val: string | number): this;
  public text(val?: string | number): string | this {
    if (val === undefined) return this.element.textContent ?? "";
    this.element.textContent = String(val);

    return this;
  }

  public html(): string;
  public html(val: string): this;
  public html(val?: string): string | this {
    if (val === undefined) return this.element.innerHTML;
    this.element.innerHTML = val;

    return this;
  }

  // for inputs, textareas and selects
  public value(): string;
  public value(val: string | number): this;
  public value(val?: string | number): string | this {
    let el = this.element as unknown as HTMLInputElement;
    if (val === undefined) return el.value;
    el.value = String(val);

    return this;
  }

  public add(...stuff: Child[]): this {
    this.element.append(...toNodes(stuff));

    return this;
  }

  public prepend(...stuff: Child[]): this {
    this.element.prepend(...toNodes(stuff));

    return this;
  }

  // sibling stuff
  public before(...stuff: Child[]): this {
    this.element.before(...toNodes(stuff));

    return this;
  }

  public after(...stuff: Child[]): this {
    this.element.after(...toNodes(stuff));

    return this;
  }

  public replaceWith(...stuff: Child[]): this {
    this.element.replaceWith(...toNodes(stuff));

    return this;
  }

  // h.ul().each(["a", "b"], (x) => h.li(x))
  public each<I>(items: Iterable<I>, fn: (item: I, i: number) => Child): this {
    let i = 0;
    for (let item of items) this.add(fn(item, i++));

    return this;
  }

  public clear(): this {
    this.element.replaceChildren();

    return this;
  }

  public clone(deep = true): Element<T> {
    // btw event listeners dont come along
    return new Element<T>(this.element.cloneNode(deep) as T);
  }

  // this method is to put it on the page
  public mount(where: string | HTMLElement | Element<any> = document.body): this {
    let target: HTMLElement | null;

    if (typeof where === "string") target = document.querySelector<HTMLElement>(where);
    else if (where instanceof Element) target = where.raw;
    else target = where;

    if (!target) throw new Error(`mount: nothing matches "${where}"`);
    target.appendChild(this.element);

    return this;
  }

  public remove(): this {
    this.element.remove();

    return this;
  }

  // these give back the raw dom nodes
  public find<E extends HTMLElement = HTMLElement>(sel: string): E | null {
    return this.element.querySelector<E>(sel);
  }

  public findAll<E extends HTMLElement = HTMLElement>(sel: string): E[] {
    return Array.from(this.element.querySelectorAll<E>(sel));
  }

  public matches(sel: string): boolean {
    return this.element.matches(sel);
  }

  public closest(sel: string): Element | null {
    let c = this.element.closest<HTMLElement>(sel);
    return c ? Element.from(c) : null;
  }

  public on<K extends string>(event: K, fn: Handler<K>, opts?: boolean | AddEventListenerOptions): this {
    this.element.addEventListener(event, fn as EventListener, opts);

    return this;
  }

  public once<K extends string>(event: K, fn: Handler<K>): this {
    return this.on(event, fn, { once: true });
  }

  public off<K extends string>(event: K, fn: Handler<K>, opts?: boolean | EventListenerOptions): this {
    this.element.removeEventListener(event, fn as EventListener, opts);

    return this;
  }

  public emit(event: string, detail?: unknown): this {
    this.element.dispatchEvent(new CustomEvent(event, { detail, bubbles: true }));

    return this;
  }

  public css(props: Partial<CSSStyleDeclaration>): this;
  public css(key: string, val: string | number): this;
  public css(key: string | Partial<CSSStyleDeclaration>, val?: string | number): this {
    if (typeof key === "object") {
      Object.assign(this.element.style, key);
    } else if (key.includes("-")) {
      // "background-color" and "--my-var" both end up here
      this.element.style.setProperty(key, String(val));
    } else {
      (this.element.style as any)[key] = val;
    }

    return this;
  }

  public addClass(...names: string[]): this {
    this.element.classList.add(...splitNames(names));

    return this;
  }

  public removeClass(...names: string[]): this {
    this.element.classList.remove(...splitNames(names));

    return this;
  }

  public toggle(name: string, force?: boolean): this {
    this.element.classList.toggle(name, force);

    return this;
  }

  public hasClass(name: string): boolean {
    return this.element.classList.contains(name);
  }

  public show(): this {
    this.element.style.display = this.oldDisplay;

    return this;
  }

  public hide(): this {
    if (this.element.style.display !== "none") this.oldDisplay = this.element.style.display;
    this.element.style.display = "none";

    return this;
  }

  public animate(frames: Keyframe[] | PropertyIndexedKeyframes, opts?: number | KeyframeAnimationOptions): Animation {
    return this.element.animate(frames, opts);
  }

  public enable(on = true): this {
    (this.element as any).disabled = !on;

    return this;
  }

  public disable(): this {
    return this.enable(false);
  }

  public focus(): this {
    this.element.focus();

    return this;
  }

  public blur(): this {
    this.element.blur();

    return this;
  }
}

interface MakeElement {
  <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    props?: Props | Child,
    ...children: Child[]
  ): Element<HTMLElementTagNameMap[K]>;
  (tag: string, props?: Props | Child, ...children: Child[]): Element;
}

type Tags = {
  [K in keyof HTMLElementTagNameMap]: (props?: Props | Child, ...children: Child[]) => Element<HTMLElementTagNameMap[K]>;
};

// h("div", ...) works, and so does h.div(...)
export const h = new Proxy(
  (tag: string, props?: Props | Child, ...children: Child[]) => new Element(tag, props, ...children),
  {
    get(target, key, receiver) {
      if (typeof key !== "string" || key in target) return Reflect.get(target, key, receiver);

      return (props?: Props | Child, ...children: Child[]) => new Element(key, props, ...children);
    },
  }
) as unknown as MakeElement & Tags;

/*
  let count = h.span("0");

  h.div({ class: "box", style: { padding: "10px" } },
    h.h1("hi"),
    count,
    h.button({ onclick: () => count.text(Number(count.text()) + 1) }, "click")
  ).mount();
*/
