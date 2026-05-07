



// const sessionCache = {};


// function generateId(src) {
//     return 'img-btn-' + btoa(src).replace(/[^a-zA-Z0-9]/g, '');
// }


// function isValidImage(img) {
//     return (
//         img.src &&
//         img.src.startsWith('http') &&
//         img.naturalWidth > 150 &&
//         img.naturalHeight > 150
//     );
// }


// function addButtonToImage(img) {
//     if (!isValidImage(img)) return;

//     const id = generateId(img.src);

   
//     if (document.getElementById(id)) return;

    
//     const wrapper = document.createElement('div');
//     wrapper.style.position = 'relative';
//     wrapper.style.display = 'inline-block';

//     img.parentNode.insertBefore(wrapper, img);
//     wrapper.appendChild(img);

    
//     const button = document.createElement('div');
//     button.id = id;
//     button.innerText = 'בודק...';

 
//     button.style.position = 'absolute';
//     button.style.top = '5px';
//     button.style.left = '5px';
//     button.style.background = 'black';
//     button.style.color = 'white';
//     button.style.padding = '4px 6px';
//     button.style.fontSize = '12px';
//     button.style.zIndex = '9999';
//     button.style.borderRadius = '4px';

//     wrapper.appendChild(button);

//     checkImage(img.src, button);
// }


// function checkImage(src, button) {
   
//     if (sessionCache[src]) {
//         updateUI(button, sessionCache[src]);
//         return;
//     }

     
//     const fakeData = {
//         aiProbability: Math.random()
//     }

    
//     sessionCache[src] = fakeData;

    
//     setTimeout(() => {
//         updateUI(button, fakeData);
//     }, 1000);
// }


// function updateUI(button, data) {
//     const percent = Math.round((data.aiProbability || 0) * 100);
//     button.innerText = `${percent}% AI`;

//     if (percent > 70) {
//         button.style.background = 'red';
//     } else if (percent > 40) {
//         button.style.background = 'orange';
//     } else {
//         button.style.background = 'green';
//     }
// }


// function scanImages() {
//     const images = document.querySelectorAll('img');

//     images.forEach(img => {
//         if (img.complete) {
//             addButtonToImage(img);
//         } else {
//             img.onload = () => addButtonToImage(img);
//         }
//     });
// }


// const observer = new MutationObserver(() => {
//     scanImages();
// });

// observer.observe(document.body, {
//     childList: true,
//     subtree: true
// });


// scanImages();

// =========================
// AI Image Scanner Extension
// =========================

// ===== Cache =====
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



function updateUI(button, data) {

    const percent = Math.round((data.aiProbability || 0) * 100);

    button.innerText = `${percent}% AI`;

    // צבע לפי אחוז
    if (percent > 70) {

        button.style.background = 'red';

    } else if (percent > 40) {

        button.style.background = 'orange';

    } else {

        button.style.background = 'green';

    }

}



function checkImage(src, button) {

    if (sessionCache[src]) {

        updateUI(button, sessionCache[src]);
        return;

    }

   
    const fakeData = {
        aiProbability: Math.random()
    }; 

    sessionCache[src] = fakeData;
    setTimeout(() => {

        updateUI(button, fakeData);

    }, 1000);

}



function createBubble(id) {
    const button = document.createElement('div');
    button.id = id;
    button.innerText = 'בודק...';

    
    button.style.position = 'absolute';
    button.style.top = '8px';
    button.style.left = '8px';
    button.style.background = 'black';
    button.style.color = 'white';
    button.style.padding = '5px 8px';
    button.style.fontSize = '12px';
    button.style.borderRadius = '6px';
    button.style.zIndex = '9999';
    button.style.fontFamily = 'Arial';
    button.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    return button;
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
    const bubble = createBubble(id);
    wrapper.appendChild(bubble);
    checkImage(img.src, bubble);

}



function scanImages() {
    const images = document.querySelectorAll('img');
    images.forEach((img) => {
        if (img.complete) {
            addButtonToImage(img);
        } else {
            img.onload = () => {
                addButtonToImage(img);
            };
        }
    });
}


const observer = new MutationObserver((mutations) => {

    mutations.forEach((mutation) => {

        mutation.addedNodes.forEach((node) => {

           
            if (!(node instanceof HTMLElement)) return;


            
            if (node.tagName === 'IMG') {

                if (node.complete) {

                    addButtonToImage(node);

                } else {

                    node.onload = () => {
                        addButtonToImage(node);
                    };

                }

            }


            
            const images = node.querySelectorAll('img');

            images.forEach((img) => {

                if (img.complete) {

                    addButtonToImage(img);

                } else {

                    img.onload = () => {
                        addButtonToImage(img);
                    };

                }

            });

        });

    });

});


observer.observe(document.body, {
    childList: true,
    subtree: true
});


scanImages();