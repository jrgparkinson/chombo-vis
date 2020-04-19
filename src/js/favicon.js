import favicon from '../img/favicon.svg';

const head = document.querySelector('head');

if (head) {
 
const link = document.createElement('link');
link.setAttribute('rel', 'icon');
link.setAttribute('href', favicon);
link.setAttribute('type', 'image/svg');
head.appendChild(link);

}
