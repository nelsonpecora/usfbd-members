// When comparing user input, we ignore case and any non-letter characters.
export default (str: string): string => str.toLowerCase().replaceAll(/[^a-z]/g, "");
