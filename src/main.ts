import { assertNonNullable, parseFloatX, parseIntX } from "phil-lib/misc";
import "./style.css";
import { getById, querySelectorAll } from "phil-lib/client-misc";

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

function displayNumber(
  value: number | undefined,
  element: HTMLElement,
  force = false
) {
  function displayError() {
    element.innerText = "invalid";
  }
  function isValid() {
    if (value === undefined || !isFinite(value)) {
      return false;
    }
    return force || value >= 0;
  }
  function displayFixed(afterTheDecimal: number): void {
    if (!isValid()) {
      displayError();
    } else {
      const asString = value!.toFixed(afterTheDecimal);
      element.innerText = asString;
    }
  }
  function displayFraction(maxDenominator: number): void {
    if (!isValid()) {
      displayError();
    } else {
      let denominator = maxDenominator;
      const improperNumerator = Math.round(value! * denominator);
      let numerator = Math.abs(improperNumerator) % denominator;
      const wholeNumber =
        (Math.abs(improperNumerator) - numerator) / denominator;
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
        if (improperNumerator < 0) {
          element.append("-");
        }
        if (wholeNumber != 0) {
          element.append(wholeNumber.toString(), " ");
        }
        element.append(numeratorSpan, "/", denominatorSpan);
      }
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
  displayNumber(undefined, specificPointResultCell);
  splitResultTable.innerHTML = "";
  extendedResultTable.innerHTML = "";
  if (dFar === undefined || dNear === undefined) {
    // No good data
  } else {
    {
      let row = splitResultTable.insertRow();
      row.insertCell().innerText = "Far";
      displayNumber(dFar, row.insertCell());
      const numberOfPieces = assertNonNullable(
        parseIntX(splitCountSelect.selectedOptions[0].value)
      );
      for (let i = 1; i < numberOfPieces; i++) {
        row = splitResultTable.insertRow();
        row.insertCell().innerText = i.toString();
        displayNumber(
          findPerspectivePoint(dFar, dNear, i / numberOfPieces),
          row.insertCell()
        );
      }
      row = splitResultTable.insertRow();
      row.insertCell().innerText = "Near";
      displayNumber(dNear, row.insertCell());
    }
    {
      const largerCount = assertNonNullable(
        parseIntX(largerCountSelect.selectedOptions[0].value)
      );
      for (let i = largerCount; i > 0; i--) {
        const row = extendedResultTable.insertRow();
        row.insertCell().innerText = i.toString();
        displayNumber(findPerspectivePoint(dFar, dNear, -i), row.insertCell());
      }
    }
    {
      const row = extendedResultTable.insertRow();
      row.insertCell().innerText = "Far";
      displayNumber(dFar, row.insertCell());
    }
    {
      const row = extendedResultTable.insertRow();
      row.insertCell().innerText = "Near";
      displayNumber(dNear, row.insertCell());
    }
    {
      const smallerCount = assertNonNullable(
        parseIntX(smallerCountSelect.selectedOptions[0].value)
      );
      for (let i = 0; i < smallerCount; i++) {
        const row = extendedResultTable.insertRow();
        row.insertCell().innerText = (i + 1).toString();
        displayNumber(
          findPerspectivePoint(dFar, dNear, i + 2),
          row.insertCell()
        );
      }
    }
    if (progress !== undefined) {
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

querySelectorAll("[data-fraction]", HTMLSpanElement).forEach((span) => {
  const number = parseFraction(assertNonNullable(span.dataset.fraction));
  if (number === undefined) {
    console.error(span);
  }
  displayNumber(number, span, true);
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
