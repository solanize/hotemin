document.addEventListener('DOMContentLoaded', async () => {
    const cardContainer = document.getElementById('card-container');
    const endScreen = document.getElementById('end-screen');
    let cardsData = [];
    let isAnimating = false; // BUGFIX: Prevent swipe spamming
    
    // Load data
    try {
        const response = await fetch('images.json');
        cardsData = await response.json();
    } catch (e) {
        console.error("Could not load images.json", e);
        endScreen.querySelector('h2').innerText = "Run via local server to load images!";
        endScreen.style.display = 'flex';
        return;
    }

    // Shuffle cards
    cardsData.sort(() => Math.random() - 0.5);
    
    // Create DOM elements for cards
    cardsData.forEach((data, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.zIndex = cardsData.length - index;
        card.dataset.author = data.author; 
        
        const imgPath = `images/${data.filename}`;
        
        card.innerHTML = `
            <div class="emoji-overlay"></div>
            <div class="badge badge-like">HOT🔥</div>
            <div class="badge badge-nope">NOT🧊</div>
            <img class="main-img" src="${imgPath}" alt="Hot Emin" onerror="this.src='https://via.placeholder.com/500x600?text=HotEmin'">
            <div class="card-info">
                <h3>@${data.author}</h3>
                <p>${data.tweet_text || '$HOTEMIN hype!'}</p>
            </div>
        `;
        
        cardContainer.appendChild(card);
        initCard(card);
    });

    const cards = Array.from(document.querySelectorAll('.card'));
    let currentCardIndex = 0;

    function initCard(card) {
        let isDragging = false;
        let startX, startY, currentX = 0, currentY = 0;
        const likeBadge = card.querySelector('.badge-like');
        const nopeBadge = card.querySelector('.badge-nope');

        card.addEventListener('pointerdown', (e) => {
            if(e.button !== 0 && e.type !== 'touchstart') return; 
            if(card !== cards[currentCardIndex]) return;
            if(isAnimating) return;

            isDragging = true;
            startX = e.clientX || e.touches?.[0].clientX;
            startY = e.clientY || e.touches?.[0].clientY;
            card.style.transition = 'none';
        });

        document.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            e.preventDefault(); // Prevent scrolling on mobile
            
            const x = e.clientX || e.touches?.[0].clientX;
            const y = e.clientY || e.touches?.[0].clientY;
            
            currentX = x - startX;
            currentY = y - startY;
            
            const rotate = currentX * 0.05;
            card.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${rotate}deg)`;

            // Opacity for badges
            if (currentX > 0) {
                likeBadge.style.opacity = Math.min(currentX / 100, 1);
                nopeBadge.style.opacity = 0;
            } else {
                nopeBadge.style.opacity = Math.min(Math.abs(currentX) / 100, 1);
                likeBadge.style.opacity = 0;
            }
        }, {passive: false});

        document.addEventListener('pointerup', (e) => {
            if (!isDragging) return;
            isDragging = false;
            
            card.style.transition = 'transform 0.3s ease';
            
            const threshold = 100; // Swipe threshold
            if (currentX > threshold) {
                swipeCard(card, 1);
            } else if (currentX < -threshold) {
                swipeCard(card, -1);
            } else {
                card.style.transform = `translate(0px, 0px) rotate(0deg)`;
                likeBadge.style.opacity = 0;
                nopeBadge.style.opacity = 0;
            }
            
            currentX = 0;
            currentY = 0;
        });
    }

    function spawnEmojis(card, type) {
        const overlay = card.querySelector('.emoji-overlay');
        const emojiSymbol = type === 'like' ? '💚' : '👎';
        
        for (let i = 0; i < 10; i++) {
            const el = document.createElement('div');
            el.className = 'falling-emoji';
            el.innerText = emojiSymbol;
            el.style.left = Math.random() * 80 + 10 + '%';
            el.style.animationDelay = (Math.random() * 0.3) + 's';
            overlay.appendChild(el);
        }
    }

    function swipeCard(card, direction) {
        if(isAnimating) return;
        isAnimating = true;

        const throwOutX = direction * window.innerWidth * 1.5;
        card.style.transform = `translate(${throwOutX}px, 0px) rotate(${direction * 30}deg)`;
        
        if(direction === 1) {
            spawnEmojis(card, 'like');
            updateLeaderboard(card.dataset.author);
        } else {
            spawnEmojis(card, 'nope');
        }

        // Give time for animation before hiding card
        setTimeout(() => {
            card.style.display = 'none';
            currentCardIndex++;
            isAnimating = false;
            checkEnd();
        }, 500); 
    }

    function checkEnd() {
        if (currentCardIndex >= cards.length) {
            endScreen.style.display = 'flex';
        }
    }

    document.getElementById('btn-nope').addEventListener('click', () => {
        if(currentCardIndex < cards.length && !isAnimating) {
            const activeCard = cards[currentCardIndex];
            activeCard.querySelector('.badge-nope').style.opacity = 1;
            swipeCard(activeCard, -1);
        }
    });

    document.getElementById('btn-like').addEventListener('click', () => {
        if(currentCardIndex < cards.length && !isAnimating) {
            const activeCard = cards[currentCardIndex];
            activeCard.querySelector('.badge-like').style.opacity = 1;
            swipeCard(activeCard, 1);
        }
    });

    // --- LEADERBOARD LOGIC (1 Vote Per Author) ---
    function updateLeaderboard(author) {
        let votedAuthors = JSON.parse(localStorage.getItem('hotemin_voted_authors')) || [];
        
        // Ensure 1 vote per author rule
        if(!votedAuthors.includes(author)) {
            votedAuthors.push(author);
            localStorage.setItem('hotemin_voted_authors', JSON.stringify(votedAuthors));

            let scores = JSON.parse(localStorage.getItem('hotemin_scores')) || {};
            scores[author] = (scores[author] || 0) + 1;
            localStorage.setItem('hotemin_scores', JSON.stringify(scores));
            
            renderLeaderboard();
        } else {
            console.log("Already voted for", author);
        }
    }

    function renderLeaderboard() {
        const list = document.getElementById('leaderboard-list');
        list.innerHTML = '';
        let scores = JSON.parse(localStorage.getItem('hotemin_scores')) || {};
        const sortedAuthors = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);
        
        if (sortedAuthors.length === 0) {
            list.innerHTML = '<li>No ratings yet! Swipe right to vote.</li>';
            return;
        }

        sortedAuthors.slice(0, 15).forEach((author, i) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>#${i+1} <a href="https://x.com/${author}" target="_blank" style="color:inherit; text-decoration:none;">@${author}</a></span> <span>${scores[author]} 🔥</span>`;
            list.appendChild(li);
        });
    }

    renderLeaderboard();

    // --- EROS ARCHERY GAME LOGIC (Evading Target) ---
    let gameScore = parseInt(localStorage.getItem('hotemin_archery_score')) || 0;
    const scoreDisplay = document.getElementById('game-score');
    scoreDisplay.innerText = gameScore;

    const gameBoard = document.getElementById('game-board');
    const eros = document.getElementById('eros');
    const target = document.getElementById('target-emin');
    
    let targetY = 50;
    let targetSpeed = 4;
    let arrows = [];
    
    function gameLoop() {
        if(!gameBoard) return;
        const boardHeight = gameBoard.clientHeight;
        const targetHeight = target.clientHeight;
        
        // Evade closest arrow
        let dodgeAmount = 0;
        let isDodging = false;
        
        const tRect = target.getBoundingClientRect();

        arrows.forEach((arrow, i) => {
            arrow.x += 18; // Fast arrow speed
            arrow.el.style.left = arrow.x + 'px';
            
            const aRect = arrow.el.getBoundingClientRect();
            
            const distanceX = tRect.left - aRect.right;
            const distanceY = Math.abs(tRect.top + (targetHeight/2) - (aRect.top + aRect.height/2));
            
            // Aggressive dodging: if arrow is within 350px horizontally and 80px vertically
            if(distanceX > 0 && distanceX < 350 && distanceY < 80) {
                isDodging = true;
                // Dodge away from arrow!
                if (aRect.top > tRect.top) {
                    dodgeAmount = -25; // move up fast
                } else {
                    dodgeAmount = 25; // move down fast
                }
            }

            // Collision
            if (aRect.right > tRect.left + 10 && aRect.left < tRect.right - 10 &&
                aRect.bottom > tRect.top + 10 && aRect.top < tRect.bottom - 10) {
                
                // Hit!
                arrow.el.remove();
                arrows.splice(i, 1);
                
                gameScore += 1;
                scoreDisplay.innerText = gameScore;
                localStorage.setItem('hotemin_archery_score', gameScore);
                
                // Visual Hit Effect
                target.style.border = "6px solid #4caf50";
                target.style.transform = 'scale(0.8) rotate(20deg)';
                setTimeout(() => {
                    target.style.border = "4px solid #ff5722";
                    target.style.transform = 'none';
                }, 150);
                
                targetSpeed += 0.2; // Game gets harder
            }
            // Miss (Out of bounds)
            else if (arrow.x > gameBoard.clientWidth) {
                arrow.el.remove();
                arrows.splice(i, 1);
            }
        });

        // Apply dodge or default floating
        if (isDodging) {
            targetY += dodgeAmount;
        } else {
            // Random floating if not dodging
            if(Math.random() < 0.1) {
                targetY += (Math.random() - 0.5) * 40;
            }
        }
        
        // Keep target within bounds
        targetY = Math.max(10, Math.min(boardHeight - targetHeight - 10, targetY));
        target.style.top = targetY + 'px';

        requestAnimationFrame(gameLoop);
    }
    
    // Start game loop
    if(gameBoard) {
        requestAnimationFrame(gameLoop);
    }

    // Shoot arrow
    gameBoard.addEventListener('pointerdown', (e) => {
        const arrowEl = document.createElement('div');
        arrowEl.className = 'arrow';
        arrowEl.innerText = '💘';
        
        const boardRect = gameBoard.getBoundingClientRect();
        const clickY = e.clientY - boardRect.top;
        
        // Move Eros to click position
        eros.style.top = clickY + 'px';
        
        arrowEl.style.top = (clickY - 25) + 'px';
        arrowEl.style.left = '60px';
        gameBoard.appendChild(arrowEl);
        
        arrows.push({ el: arrowEl, x: 60 });
    });

    window.resetGame = function() {
        // Reset Game Score
        gameScore = 0;
        scoreDisplay.innerText = gameScore;
        localStorage.setItem('hotemin_archery_score', 0);
        targetSpeed = 4;

        // Reset Leaderboard and Voted Authors
        localStorage.removeItem('hotemin_scores');
        localStorage.removeItem('hotemin_voted_authors');
        renderLeaderboard();
        
        // Reset Match 3
        match3Score = 0;
        match3ScoreDisplay.innerText = match3Score;
        createBoard();
    };

    // --- MATCH-3 GAME (HOT EMIN CRUSH) LOGIC ---
    const match3Board = document.getElementById('match3-board');
    const match3ScoreDisplay = document.getElementById('match3-score');
    let match3Score = parseInt(localStorage.getItem('hotemin_match3_score')) || 0;
    if(match3ScoreDisplay) match3ScoreDisplay.innerText = match3Score;
    
    const width = 8;
    const squares = [];
    const candyColors = ['🔥', '🧊', '🔺', '💚', '🐶'];

    let colorBeingDragged;
    let colorBeingReplaced;
    let squareIdBeingDragged;
    let squareIdBeingReplaced;

    function createBoard() {
        if(!match3Board) return;
        match3Board.innerHTML = '';
        squares.length = 0;
        
        for (let i = 0; i < width * width; i++) {
            const square = document.createElement('div');
            square.setAttribute('draggable', true);
            square.setAttribute('id', i);
            let randomColor = Math.floor(Math.random() * candyColors.length);
            square.innerText = candyColors[randomColor];
            match3Board.appendChild(square);
            squares.push(square);
            
            // Event Listeners for Dragging
            square.addEventListener('dragstart', dragStart);
            square.addEventListener('dragover', dragOver);
            square.addEventListener('dragenter', dragEnter);
            square.addEventListener('dragleave', dragLeave);
            square.addEventListener('drop', dragDrop);
            square.addEventListener('dragend', dragEnd);
            
            // Touch support for mobile (basic implementation)
            square.addEventListener('touchstart', handleTouchStart, {passive: false});
            square.addEventListener('touchmove', handleTouchMove, {passive: false});
            square.addEventListener('touchend', handleTouchEnd);
        }
    }

    if(match3Board) createBoard();

    // Drag Events
    function dragStart() {
        colorBeingDragged = this.innerText;
        squareIdBeingDragged = parseInt(this.id);
    }
    function dragOver(e) { e.preventDefault(); }
    function dragEnter(e) { e.preventDefault(); }
    function dragLeave() {}
    function dragDrop() {
        colorBeingReplaced = this.innerText;
        squareIdBeingReplaced = parseInt(this.id);
        // Swap
        squares[squareIdBeingDragged].innerText = colorBeingReplaced;
        squares[squareIdBeingReplaced].innerText = colorBeingDragged;
    }
    
    function dragEnd() {
        let validMoves = [
            squareIdBeingDragged - 1, 
            squareIdBeingDragged - width,
            squareIdBeingDragged + 1,
            squareIdBeingDragged + width
        ];
        
        let validMove = validMoves.includes(squareIdBeingReplaced);
        
        if (squareIdBeingReplaced && validMove) {
            squareIdBeingReplaced = null;
            // Let the interval check for matches
        } else if (squareIdBeingReplaced && !validMove) {
            // Invalid move, swap back
            squares[squareIdBeingReplaced].innerText = colorBeingReplaced;
            squares[squareIdBeingDragged].innerText = colorBeingDragged;
        } else {
            squares[squareIdBeingDragged].innerText = colorBeingDragged;
        }
    }

    // Touch logic
    let touchStartX, touchStartY, touchStartSquare;
    function handleTouchStart(e) {
        touchStartSquare = this;
        colorBeingDragged = this.innerText;
        squareIdBeingDragged = parseInt(this.id);
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        e.preventDefault();
    }
    function handleTouchMove(e) { e.preventDefault(); }
    function handleTouchEnd(e) {
        if(!touchStartSquare) return;
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;
        
        let targetId = squareIdBeingDragged;
        if(Math.abs(diffX) > Math.abs(diffY)) {
            // Horizontal
            if(diffX > 30) targetId += 1;
            else if(diffX < -30) targetId -= 1;
        } else {
            // Vertical
            if(diffY > 30) targetId += width;
            else if(diffY < -30) targetId -= width;
        }
        
        if(targetId !== squareIdBeingDragged && targetId >= 0 && targetId < 64) {
            squareIdBeingReplaced = targetId;
            colorBeingReplaced = squares[targetId].innerText;
            squares[squareIdBeingDragged].innerText = colorBeingReplaced;
            squares[squareIdBeingReplaced].innerText = colorBeingDragged;
            dragEnd();
        }
        touchStartSquare = null;
    }

    // Drop candies down
    function moveDown() {
        for (let i = 0; i < 55; i++) {
            if (squares[i + width].innerText === '') {
                squares[i + width].innerText = squares[i].innerText;
                squares[i].innerText = '';
                const firstRow = [0,1,2,3,4,5,6,7];
                const isFirstRow = firstRow.includes(i);
                if (isFirstRow && squares[i].innerText === '') {
                    let randomColor = Math.floor(Math.random() * candyColors.length);
                    squares[i].innerText = candyColors[randomColor];
                }
            }
        }
        // Fill top row if empty
        for(let i = 0; i < 8; i++) {
            if(squares[i].innerText === '') {
                squares[i].innerText = candyColors[Math.floor(Math.random() * candyColors.length)];
            }
        }
    }

    // Check for matches
    function checkRowForThree() {
        for (let i = 0; i < 61; i++) {
            let rowOfThree = [i, i+1, i+2];
            let decidedColor = squares[i].innerText;
            const isBlank = squares[i].innerText === '';
            const notValid = [6,7,14,15,22,23,30,31,38,39,46,47,54,55,62,63];
            if (notValid.includes(i)) continue;

            if (rowOfThree.every(index => squares[index].innerText === decidedColor && !isBlank)) {
                match3Score += 3;
                match3ScoreDisplay.innerText = match3Score;
                localStorage.setItem('hotemin_match3_score', match3Score);
                rowOfThree.forEach(index => {
                    squares[index].innerText = '';
                });
            }
        }
    }

    function checkColumnForThree() {
        for (let i = 0; i < 47; i++) {
            let columnOfThree = [i, i+width, i+width*2];
            let decidedColor = squares[i].innerText;
            const isBlank = squares[i].innerText === '';

            if (columnOfThree.every(index => squares[index].innerText === decidedColor && !isBlank)) {
                match3Score += 3;
                match3ScoreDisplay.innerText = match3Score;
                localStorage.setItem('hotemin_match3_score', match3Score);
                columnOfThree.forEach(index => {
                    squares[index].innerText = '';
                });
            }
        }
    }

    if(match3Board) {
        window.setInterval(function() {
            checkRowForThree();
            checkColumnForThree();
            moveDown();
        }, 100);
    }
});
