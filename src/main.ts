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
const largerCopiesSpan = getById("larger-copies", HTMLSpanElement);
const smallerCountSelect = getById("smaller-count", HTMLSelectElement);
const smallerCopiesSpan = getById("smaller-copies", HTMLSpanElement);
const extendedResultTable = getById("extended-result", HTMLTableElement);
const specificPointResultCell = getById(
  "specific-point-result",
  HTMLTableCellElement
);

/**
 * This does an attractive display of numbers.
 *
 * The format of the number comes from the precision input on the screen.
 * If precision is set to a fraction, we will use fancy CSS to display the fraction nicely.
 *
 * If there is a problem with the value, this will display "invalid" in the element.
 * A value is bad if it is `undefined`, not finite, or unexpectedly negative.
 * @param value The number to display.
 * @param element Where to display the result.
 * @param allowNegatives Are negative numbers legal?  Defaults to false.
 */
function displayNumber(
  value: number | undefined,
  element: HTMLElement,
  allowNegatives = false
) {
  function displayError() {
    element.innerText = "invalid";
  }
  function isValid() {
    if (value === undefined || !isFinite(value)) {
      return false;
    }
    return allowNegatives || value >= 0;
  }
  /**
   * Display the number with a fixed number of digits after the decimal.
   *
   * Use case: my ruler has a number for each centimeter, but had a tick mark for each millimeter.
   * So I enter the numbers in centimeters, and display 1 digit after the decimal here.
   * @param afterTheDecimal How many digits to display after the decimal point.
   */
  function displayFixed(afterTheDecimal: number): void {
    if (!isValid()) {
      displayError();
    } else {
      const asString = value!.toFixed(afterTheDecimal);
      element.innerText = asString;
    }
  }
  /**
   * Display the result as a fraction.
   * @param maxDenominator The most precision we want to display.
   *
   * This should be a power of 2.
   * E.g. 32 if I want to show results in 32nds.
   *
   * The fraction will be simplified.
   * If you ask for values in 32nds, 0.5 will still appear as "1/2".
   * "0.500001" will also appear as "1/2".
   */
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

/**
 * This is the actual computation.
 * This corresponds directly to the "Specific Point" section of web page.
 * This is also used by the "Split" and "Extend" logic.
 * @param dFar The distance from the vanishing point to the larger of the parallel lines.
 * This value should be larger than `dClose`.
 * @param dNear The distance from the vanishing point to the smaller of the parallel lines.
 * This value should be smaller than `dFar`.
 * @param progress
 * * 0 means the far line.
 * * 1 means the near line.
 * * ½ (or 0.5) means half way between.
 * * 1 ½ (or 1.5) means go the whole way from far to near, then 50% further.
 * * -½ (or -0.5) means to go the whole way from near to far, then 50% further.
 * @returns Where to draw a new line parallel to the two existing parallel lines.
 */
function findPerspectivePoint(
  dFar: number,
  dNear: number,
  progress: number
): number {
  return (dFar * dNear) / ((1 - progress) * dNear + progress * dFar);
}

/**
 * Reads numbers like "5", "5.5" (normal floating point parse), "1 2/3" (whole number and fraction),
 * "72/3" (fraction without whole number), "-72/3" (a negative sign in front of any of those).
 * @param input
 * @returns A number, or undefined if the parse failed.
 */
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

/**
 * Read a number from an `<input>`.
 * Make the background pink if the input is not a valid number.
 * @param inputElement The source of the number
 * @returns The number that was in there, or `undefined` if the contents could not be parsed.
 */
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

/**
 * Call this any time any of the inputs changes.
 */
function updateDisplay() {
  const dFar = getNumberValue(dFarInput);
  const dNear = getNumberValue(dNearInput);
  const progress = getNumberValue(progressInput);
  displayNumber(undefined, specificPointResultCell);
  splitResultTable.innerHTML = "";
  extendedResultTable.innerHTML = "";
  function fixCopies(count: number, span: HTMLSpanElement) {
    const text = count == 1 ? "copy" : "copies";
    span.innerText = text;
  }
  const largerCount = assertNonNullable(
    parseIntX(largerCountSelect.selectedOptions[0].value)
  );
  fixCopies(largerCount, largerCopiesSpan);
  const smallerCount = assertNonNullable(
    parseIntX(smallerCountSelect.selectedOptions[0].value)
  );
  fixCopies(smallerCount, smallerCopiesSpan);

  if (dFar === undefined || dNear === undefined) {
    // No good data
  } else {
    {
      // Show "split" table.
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
      // Show top of "extend" table.
      for (let i = largerCount; i > 0; i--) {
        const row = extendedResultTable.insertRow();
        row.insertCell().innerText = i.toString();
        displayNumber(findPerspectivePoint(dFar, dNear, -i), row.insertCell());
      }
    }
    {
      // Show fixed part of "extend" table.
      const row = extendedResultTable.insertRow();
      row.insertCell().innerText = "Far";
      displayNumber(dFar, row.insertCell());
    }
    {
      // Show fixed part of "extend" table.
      const row = extendedResultTable.insertRow();
      row.insertCell().innerText = "Near";
      displayNumber(dNear, row.insertCell());
    }
    {
      // Show bottom of "extend" table.
      for (let i = 0; i < smallerCount; i++) {
        const row = extendedResultTable.insertRow();
        row.insertCell().innerText = (i + 1).toString();
        displayNumber(
          findPerspectivePoint(dFar, dNear, i + 2),
          row.insertCell()
        );
      }
    }
    // Show "specific point" result.
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

// Update some constant fractions written directly into the HTML with our nicer formatting.
querySelectorAll("[data-fraction]", HTMLSpanElement).forEach((span) => {
  const number = parseFraction(assertNonNullable(span.dataset.fraction));
  if (number === undefined) {
    console.error(span);
  }
  displayNumber(number, span, true);
});

// Make things available for debugging in the console.
(window as any).PHIL = {
  dFarInput,
  dNearInput,
  progressInput,
  parseFraction,
  getNumberValue,
  findPerspectivePoint,
  updateDisplay,
};
