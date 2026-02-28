/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** API Token - Bearer token from vikunja.jkrumm.com/user/settings/token */
  "apiToken": string,
  /** Vikunja URL - Base URL of your Vikunja instance */
  "baseUrl": string,
  /** Default Project ID - Project used for Quick Add (optional) */
  "defaultProjectId"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `my-tasks` command */
  export type MyTasks = ExtensionPreferences & {}
  /** Preferences accessible in the `create-task` command */
  export type CreateTask = ExtensionPreferences & {}
  /** Preferences accessible in the `quick-add` command */
  export type QuickAdd = ExtensionPreferences & {}
  /** Preferences accessible in the `menu-bar` command */
  export type MenuBar = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `my-tasks` command */
  export type MyTasks = {}
  /** Arguments passed to the `create-task` command */
  export type CreateTask = {}
  /** Arguments passed to the `quick-add` command */
  export type QuickAdd = {}
  /** Arguments passed to the `menu-bar` command */
  export type MenuBar = {}
}

