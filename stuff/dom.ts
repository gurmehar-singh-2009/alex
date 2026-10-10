// stupid dom stuff ewwww ew ewe we wew ew e eww ewew ewew ew ew EWWWW

class Element {
  private element: HTMLElement;
  private children: HTMLElement[];

  constructor(tag: string = "div", props = {}, ...children) {
    this.element = document.createElement(tag);
    this.children = [];

    // allow Element("p", "wow!") as well as Element("div", other_element)
    if (
      typeof props === "string" ||
      props instanceof Element ||
      props instanceof Node
    ) {
      children.unshift(props);
      props = {};
    }

    for (let k in props) {
      this.set(k, props[k]);
    }
    this.add(...kids);
  }

  public set(key: string, val: string): this {
    if (key === "class") {
      this.element.className = val;
    } else if (key === "text") {
      this.element.textContent = val;
    } else if (key === "style" && typeof val === "object") {
      Object.assign(this.element.style, val);
    } else if (key.startsWith("on")) {
      this.element.addEventListener(key.slice(2).toLowerCase(), val);
    } else if (key in this.element) {
      this.element[key] = val;
    } else {
      this.element.setAttribute(key, val);
    }

    return this;
  }

  public get(key) {
    return this.element.getAttribute(key);
  }

  public text(val: string): this {
    this.element.textContent = val;

    return this;
  }

  public add(...stuff) {
    for (let thing of stuff.flat()) {
      if (!thing) continue;

      if (thing instanceof Element) {
        this.children.push(thing);
        this.element.appendChild(thing.element);
      } else if (thing instanceof Node) {
        this.element.appendChild(thing);
      } else {
        this.element.appendChild(document.createTextNode(thing));
      }
    }

    return this;
  }

  public clear(): this {
    this.children = [];
    this.element.replaceChildren();

    return this;
  }

  public on(event: HTMLElementEventMap, fn: Function) {
    this.element.addEventListener(event, fn);

    return this;
  }

  public css(stuff: string): this {
    Object.assign(this.element.style, stuff);

    return this;
  }

  public addClass(...names: string[]): this {
    this.element.classList.add(...names);

    return this;
  }

  public removeClass(...names: string[]): this {
    this.element.classList.remove(...names);

    return this;
  }

  public toggle(name, force) {
    this.element.classList.toggle(name, force);

    return this;
  }

  public find(sel) {
    return this.element.querySelector(sel);
  }

  // this method is to put it on the page
  mount(where = document.body) {
    if (typeof where === "string") {
      where = document.querySelector(where);
    }

    if (where instanceof Element) {
      where = where.element;
    }

    where.appendChild(this.element);

    return this;
  }

  public remove(): this {
    this.element.remove();

    return this;
  }
}

const h = (tag, props, ...children) => new Element(tag, props, ...children);
