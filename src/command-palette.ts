import * as helpers from "./helpers.js";
import * as dom from "./dom.js";
import { $Store } from "./store.js";

interface Props { }

interface Command {
  id: string
  title: string
  onKeyUp(event: KeyboardEvent): void
  onSelect(): void
}

export class CommandPalette implements helpers.IDisposable {
  el: HTMLDivElement
  modal: HTMLDivElement
  list: HTMLDivElement
  input: HTMLInputElement
  inputPlaceholder: string
  commands: Command[]
  filteredCommands: Command[]
  listeners: helpers.Listeners
  selectedItem: number
  selectedCommand?: Command

  constructor(protected props: Props, protected store = $Store()) {
    this.listeners = new helpers.Listeners()
    this.selectedItem = 0
    this.selectedCommand = void 0;
    this.inputPlaceholder = "Search command"
    this.filteredCommands = this.commands = [
      {
        id: "transfer",
        title: "Transfer to",
        onKeyUp: () => { },
        onSelect: () => alert("tranfer")
      },
      {
        id: "deactivate_chat",
        title: "Archive chat",
        onKeyUp: () => { },
        onSelect: () => alert("close")
      },
    ]

    this.el = dom.createEl("div", { className: "command-palette-container hidden" }, [
      this.modal = dom.createEl("div", { className: "command-palette" }, [
        dom.createEl("div", { className: "command-palette-header" }, [
          this.input = dom.createEl("input", { className: "command-palette-input" })
        ]),
        dom.createEl("div", { className: "command-palette-body" }, [
          this.list = dom.createEl("div", { className: "command-palette-list" })
        ])
      ])
    ])

    this.listeners.register(dom.addListener(this.el, "click", () => this.hide()))
    this.listeners.register(dom.addListener(this.modal, "click", event => event.stopPropagation()))
    this.listeners.register(dom.addListener(this.input, "keydown", event => this.handleKeyDown(event)))
    this.listeners.register(dom.addListener(this.input, "keyup", event => this.handleKeyUp(event)))

    this.render()
  }

  show() {
    dom.toggleEl(this.el, true)
    this.input.value = ""
    this.input.focus()
    this.filteredCommands = this.commands
    this.selectedItem = 0
    this.selectedCommand = void 0
    this.render()
  }

  hide() {
    dom.toggleEl(this.el, false)
  }

  dispose() {
    this.el.remove()
  }

  protected handleKeyDown(event: KeyboardEvent) {
    if (event.code === "ArrowDown" || event.code === "ArrowUp") {
      this.selectedItem = this.selectedItem + (event.code === "ArrowDown" ? 1 : -1)

      if (this.selectedItem < 0) {
        this.selectedItem = this.filteredCommands.length - 1
      }

      if (!this.filteredCommands[this.selectedItem]) {
        this.selectedItem = 0
      }

      event.preventDefault()
    }

    this.render()
  }

  protected handleKeyUp(event: KeyboardEvent) {
    if (event.defaultPrevented) {
      return // Do nothing if event already handled
    }

    const command = this.filteredCommands[this.selectedItem]

    if (event.code === "Enter" && this.selectedCommand) {
      return this.selectedCommand.onSelect()
    }

    if (event.code === "Enter" && command) {
      return this.selectedCommand = command, command.onSelect()
    }
  }

  protected render() {
    this.renderList()
  }

  protected renderList() {
    dom.selectAll(this.list)
      .data(this.filteredCommands, d => d?.id)
      .join(
        (enter, item, i) => enter.append(dom.createEl("button", {
          textContent: item.title,
          className: helpers.classNames("command-palette-item", { selected: i === this.selectedItem }),
        })),
        (update, item, i) => Object.assign(update, {
          textContent: item.title,
          className: helpers.classNames("command-palette-item", { selected: i === this.selectedItem })
        }),
        exit => exit.remove()
      )
  }
}
