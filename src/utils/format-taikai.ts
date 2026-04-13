export type TaikaiWin = {
  place?: number;
  name: string;
};

export default function formatTaikaiWin(val: TaikaiWin[]) {
  return val
    .map((t) => {
      let place;

      switch (t.place) {
        case 1:
          place = "1st Place";
          break;
        case 2:
          place = "2nd Place";
          break;
        case 3:
          place = "3rd Place";
          break;
        default:
          place = "Won";
      }
      return `<strong>${place}:</strong> ${t.name}`;
    })
    .join("<br />");
}
