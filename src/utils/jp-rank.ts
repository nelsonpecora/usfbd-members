export default function getJPRank(val: string) {
  switch (val) {
    case "Shodan":
      return "初段";
    case "Nidan":
      return "弐段";
    case "Sandan":
      return "参段";
    case "Yondan":
      return "四段";
    case "Godan":
      return "五段";
    case "Rokudan":
      return "六段";
    case "Nanadan":
      return "七段";
    case "Hachidan":
      return "八段";
    case "Renshi":
      return "錬士";
    case "Kyoshi":
      return "教士";
    case "Hanshi":
      return "範士";
  }
}
