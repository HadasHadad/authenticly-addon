



const sessionCache = {};


function generateId(src) {
    return 'img-btn-' + btoa(src).replace(/[^a-zA-Z0-9]/g, '');
}


function isValidImage(img) {
    return (
        img.src &&
        img.src.startsWith('http') &&
        img.naturalWidth > 150 &&
        img.naturalHeight > 150
    );
}


function addButtonToImage(img) {
    if (!isValidImage(img)) return;

    const id = generateId(img.src);

   
    if (document.getElementById(id)) return;

    
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';

    img.parentNode.insertBefore(wrapper, img);
    wrapper.appendChild(img);

    
    const button = document.createElement('div');
    button.id = id;
    button.innerText = 'בודק...';

 
    button.style.position = 'absolute';
    button.style.top = '5px';
    button.style.left = '5px';
    button.style.background = 'black';
    button.style.color = 'white';
    button.style.padding = '4px 6px';
    button.style.fontSize = '12px';
    button.style.zIndex = '9999';
    button.style.borderRadius = '4px';

    wrapper.appendChild(button);

    checkImage(img.src, button);
}


function checkImage(src, button) {
   
    if (sessionCache[src]) {
        updateUI(button, sessionCache[src]);
        return;
    }

     
    const fakeData = {
        aiProbability: Math.random()
    }

    
    sessionCache[src] = fakeData;

    
    setTimeout(() => {
        updateUI(button, fakeData);
    }, 1000);
}


function updateUI(button, data) {
    const percent = Math.round((data.aiProbability || 0) * 100);
    button.innerText = `${percent}% AI`;

    if (percent > 70) {
        button.style.background = 'red';
    } else if (percent > 40) {
        button.style.background = 'orange';
    } else {
        button.style.background = 'green';
    }
}


function scanImages() {
    const images = document.querySelectorAll('img');

    images.forEach(img => {
        if (img.complete) {
            addButtonToImage(img);
        } else {
            img.onload = () => addButtonToImage(img);
        }
    });
}


const observer = new MutationObserver(() => {
    scanImages();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});


scanImages();