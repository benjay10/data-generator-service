export function generateRandomContent(nwords) {
  let word, wordlength, content;
  content        = [];
  let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.;,?";
  let charlength = characters.length;
  
  for (let i = 0; i < nwords; i++) {
    wordlength = Math.random() * 20;
    word       = [];
    for (let j = 0; j < wordlength; j++) {
      word.push(characters.charAt(Math.floor(Math.random() * charlength)));
    }
    content.push(word.join(""));
  }
    
  return content.join(" ");
}

