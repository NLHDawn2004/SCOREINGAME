export const teamLogoKey=name=>String(name).normalize('NFC').trim().toLocaleLowerCase('vi');
export function logoFileTeamKey(filename){
 if(!/\.(png|jpe?g|webp)$/i.test(filename))return null;
 const key=teamLogoKey(filename.replace(/\.(png|jpe?g|webp)$/i,''));
 return key||null;
}
