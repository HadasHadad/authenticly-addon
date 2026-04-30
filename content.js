
// const images = document.querySelectorAll('img');
// images.forEach(img => {
//  img.style.border = "5px solid yellow";
// });


function generateId(src) {
    return 'img-btn-' + btoa(src).replace(/[^a-zA-Z0-9]/g, '');
}


function addButtonToImage(img) {
    
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';

   
    img.parentNode.insertBefore(wrapper, img);
    wrapper.appendChild(img);

    
    const button = document.createElement('div');
    button.innerText = '★';
    
    
    button.id = generateId(img.src);

   
    button.style.position = 'absolute';
    button.style.top = '5px';
    button.style.left = '5px';
    button.style.background = 'yellow';
    button.style.padding = '5px';
    button.style.cursor = 'pointer';
    button.style.zIndex = '9999';
    button.style.borderRadius = '5px';

    wrapper.appendChild(button);
}


const images = document.querySelectorAll('img');

images.forEach(img => {
    addButtonToImage(img);
});