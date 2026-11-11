import type { Theme } from "./types";
export const THEMES: {
  id: Theme;
  name: string;
  mode: "light" | "dark";
  colors: string[];
}[] = [
  {
    id: "dark",
    name: "Carbon & sage",
    mode: "dark",
    colors: ["#111111", "#A5BAAA", "#DDC18A"],
  },
  {
    id: "forest",
    name: "Carbon & fern",
    mode: "dark",
    colors: ["#111111", "#B0BB91", "#DFCF8F"],
  },
  {
    id: "slate",
    name: "Carbon & atlantic",
    mode: "dark",
    colors: ["#111111", "#A0BACD", "#DBB998"],
  },
  {
    id: "light",
    name: "Paper & olive",
    mode: "light",
    colors: ["#FFFFFF", "#435B43", "#9B4F2B"],
  },
  {
    id: "warm",
    name: "Paper & ochre",
    mode: "light",
    colors: ["#FFFFFF", "#77582B", "#355E78"],
  },
  {
    id: "rose",
    name: "Paper & plum",
    mode: "light",
    colors: ["#FFFFFF", "#6B4357", "#306B60"],
  },
];
