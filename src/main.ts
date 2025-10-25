import {
  assertFinite,
  assertNonNullable,
  parseFloatX,
  parseIntX,
} from "phil-lib/misc";
import "./style.css";
import { getById } from "phil-lib/client-misc";

const dFarInput = getById("d-far", HTMLInputElement);
const dNearInput = getById("d-near", HTMLInputElement);
const progressInput = getById("progress", HTMLInputElement);
const precisionSelect = getById("precision", HTMLSelectElement);
const splitCountSelect = getById("split-count", HTMLSelectElement);
const splitResultTable = getById("split-result", HTMLTableElement);
const largerCountSelect = getById("larger-count", HTMLSelectElement);
const smallerCountSelect = getById("smaller-count", HTMLSelectElement);
const extendedResultTable = getById("extended-result", HTMLTableElement);
const specificPointResultCell = getById(
  "specific-point-result",
  HTMLTableCellElement
);

function displayNumber(value: number | undefined, element: HTMLElement) {
  console.log(value, element);
  function displayFixed(afterTheDecimal: number): void {
    const asString = value!.toFixed(afterTheDecimal);
    element.innerText = asString;
  }
  function displayFraction(maxDenominator: number): void {
    const fraction = value! % 1;
    const wholeNumber = value! - fraction;
    let denominator = maxDenominator;
    let numerator = Math.abs(Math.round(fraction * denominator));
    if (numerator == 0) {
      displayFixed(0);
    } else {
      while (numerator % 2 == 0) {
        numerator /= 2;
        denominator /= 2;
      }
      const numeratorSpan = document.createElement("span");
      numeratorSpan.classList.add("numerator");
      numeratorSpan.innerText = numerator.toString();
      const denominatorSpan = document.createElement("span");
      denominatorSpan.classList.add("denominator");
      denominatorSpan.innerText = denominator.toString();
      element.innerHTML = "";
      element.append(
        wholeNumber.toString(),
        " ",
        numeratorSpan,
        "/",
        denominatorSpan
      );
    }
  }
  if (value === undefined) {
    element.innerHTML = "";
  } else {
    const key = precisionSelect.selectedOptions[0];
    const value = key.value;
    switch (value) {
      case "0.1": {
        displayFixed(1);
        break;
      }
      case "0.01": {
        displayFixed(2);
        break;
      }
      case "0.001": {
        displayFixed(3);
        break;
      }
      case "0.0001": {
        displayFixed(4);
        break;
      }
      case "1/2": {
        displayFraction(2);
        break;
      }
      case "1/4": {
        displayFraction(4);
        break;
      }
      case "1/8": {
        displayFraction(8);
        break;
      }
      case "1/16": {
        displayFraction(16);
        break;
      }
      case "1/32": {
        displayFraction(32);
        break;
      }
      case "1/64": {
        displayFraction(64);
        break;
      }
      default: {
        throw new Error(`wtf (${value})`);
      }
    }
  }
}

function findPerspectivePoint(
  dFar: number,
  dClose: number,
  progress: number
): number {
  // dFar: distance from vanishing point to farther parallel side (wider)
  // dClose: distance from vanishing point to closer parallel side (narrower)
  // progress: 0 = farther side, 1 = closer side, 0.5 = halfway
  // Returns: distance from vanishing point to the point at given progress
  return (dFar * dClose) / ((1 - progress) * dClose + progress * dFar);
}

function parseFraction(input: string): number | undefined {
  const fractionRE = /^ *(-)?(\d+ +)?(\d+) *\/ *(\d+) *$/;
  const fractionResult = fractionRE.exec(input);
  if (fractionResult) {
    const [
      ,
      signString,
      wholeNumberString,
      numeratorString,
      denominatorString,
    ] = fractionResult;
    const wholeNumber =
      wholeNumberString === undefined
        ? 0
        : assertNonNullable(parseIntX(wholeNumberString));
    const numerator = assertNonNullable(parseIntX(numeratorString));
    const denominator = assertNonNullable(parseIntX(denominatorString));
    const sign = signString === "-" ? -1 : 1;
    if (denominator == 0) {
      return undefined;
    } else {
      return sign * (wholeNumber + numerator / denominator);
    }
  } else {
    return parseFloatX(input);
  }
}

function getNumberValue(inputElement: HTMLInputElement) {
  const rawString = inputElement.value;
  const result = parseFraction(rawString);
  if (result === undefined) {
    inputElement.style.backgroundColor = "pink";
  } else {
    inputElement.style.backgroundColor = "";
  }
  return result;
}

function updateDisplay() {
  const dFar = getNumberValue(dFarInput);
  const dNear = getNumberValue(dNearInput);
  const progress = getNumberValue(progressInput);
  if (dFar === undefined || dNear === undefined) {
    displayNumber(undefined, specificPointResultCell);
  } else {
    if (progress === undefined) {
      displayNumber(undefined, specificPointResultCell);
    } else {
      displayNumber(
        findPerspectivePoint(dFar, dNear, progress),
        specificPointResultCell
      );
    }
  }
}
updateDisplay();
[
  dFarInput,
  dNearInput,
  progressInput,
  precisionSelect,
  splitCountSelect,
  largerCountSelect,
  smallerCountSelect,
].forEach((element) => {
  element.addEventListener("input", updateDisplay);
});

(window as any).PHIL = {
  dFarInput,
  dNearInput,
  progressInput,
  parseFraction,
  getNumberValue,
  findPerspectivePoint,
  updateDisplay,
};
