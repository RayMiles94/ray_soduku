
  /* Embedded Sudoku generator + solver (adapted from earlier JS module) */
  (function(){
    // Utilities
    function cloneBoard(board){return board.map(r=>r.slice())}
    function emptyBoard(){return Array.from({length:9},()=>Array(9).fill(0))}
    function shuffle(arr){for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}return arr}
    function isValid(board,r,c,num){
      for(let i=0;i<9;i++){if(board[r][i]===num) return false; if(board[i][c]===num) return false}
      const br=Math.floor(r/3)*3, bc=Math.floor(c/3)*3
      for(let i=0;i<3;i++) for(let j=0;j<3;j++) if(board[br+i][bc+j]===num) return false
      return true
    }

    function solve(boardInput, options={}){
      const {countOnly=false, maxSolutions=1} = options
      const board = cloneBoard(boardInput)
      let solutions = 0; let solutionBoard = null
      function findEmpty(){for(let r=0;r<9;r++) for(let c=0;c<9;c++) if(board[r][c]===0) return [r,c]; return null}
      function backtrack(){
        if(solutions>=maxSolutions) return
        const spot = findEmpty(); if(!spot){ solutions++; if(!countOnly) solutionBoard = cloneBoard(board); return }
        const [r,c]=spot
        for(let num=1;num<=9;num++){
          if(isValid(board,r,c,num)){
            board[r][c]=num; backtrack(); board[r][c]=0; if(solutions>=maxSolutions) return
          }
        }
      }
      backtrack(); if(countOnly) return solutions; return solutionBoard
    }

    function generateSolution(){
      const board = emptyBoard();
      function findEmpty(){for(let r=0;r<9;r++) for(let c=0;c<9;c++) if(board[r][c]===0) return [r,c]; return null}
      function backtrack(){
        const spot=findEmpty(); if(!spot) return true; const [r,c]=spot; const nums=shuffle([1,2,3,4,5,6,7,8,9])
        for(const num of nums){ if(isValid(board,r,c,num)){ board[r][c]=num; if(backtrack()) return true; board[r][c]=0 } }
        return false
      }
      backtrack(); return board
    }

    function generatePuzzle(difficulty='medium'){
      let removals
      if(typeof difficulty==='number') removals=difficulty
      else{ switch(difficulty){case 'easy': removals=36; break; case 'medium': removals=46; break; case 'hard': removals=54; break; default: removals=46} }
      const solution = generateSolution(); const puzzle = cloneBoard(solution)
      const cells = []; for(let r=0;r<9;r++) for(let c=0;c<9;c++) cells.push([r,c]); shuffle(cells)
      let removed=0
      for(let i=0;i<cells.length && removed<removals;i++){
        const [r,c]=cells[i]; const backup=puzzle[r][c]; puzzle[r][c]=0
        const count = solve(puzzle, {countOnly:true, maxSolutions:2})
        if(count !== 1) puzzle[r][c]=backup; else removed++
      }
      return puzzle
    }

    // UI bindings
    const boardEl = document.getElementById('board')
    const msg = document.getElementById('message')
    const difficultySel = document.getElementById('difficulty')
    const generateBtn = document.getElementById('generate')
    const solveBtn = document.getElementById('solve')
    const checkBtn = document.getElementById('check')
    const clearBtn = document.getElementById('clear')

    let current = emptyBoard();
    let fixed = Array.from({length:9},()=>Array(9).fill(false))

    function renderBoard(board){ boardEl.innerHTML = '';
      for(let r=0;r<9;r++){
        for(let c=0;c<9;c++){
          const val = board[r][c]
          const cell = document.createElement('div')
          cell.className = 'cell' + ((c%3===2 && c!==8)?' sep-col':'') + ((r%3===2 && r!==8)?' sep-row':'')
          if(fixed[r][c]) cell.classList.add('prefilled')
          const input = document.createElement('input')
          input.type = 'text'
          input.inputMode = 'numeric'
          input.maxLength = 1
          input.value = val === 0 ? '' : String(val)
          if(fixed[r][c]){ input.readOnly = true }
          input.addEventListener('keydown', (e)=>{
            const allowed = ['1','2','3','4','5','6','7','8','9','Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab']
            if(!allowed.includes(e.key)) e.preventDefault()
            if(e.key === 'Enter'){ e.preventDefault(); focusNext(r,c) }
          })
          input.addEventListener('input', (e)=>{
            const v = input.value.replace(/[^1-9]/g,'')
            input.value = v
            current[r][c] = v === '' ? 0 : Number(v)
          })
          input.addEventListener('focus', ()=>{ cell.style.boxShadow='0 6px 18px rgba(12,20,40,0.6) inset' })
          input.addEventListener('blur', ()=>{ cell.style.boxShadow='none' })
          cell.appendChild(input)
          boardEl.appendChild(cell)
        }
      }
    }

    function focusNext(r,c){
      const idx = r*9 + c
      const next = Math.min(80, idx+1)
      boardEl.children[next].querySelector('input').focus()
    }

    function setPuzzle(puzzle){ current = cloneBoard(puzzle); fixed = Array.from({length:9},()=>Array(9).fill(false)); for(let r=0;r<9;r++) for(let c=0;c<9;c++) if(puzzle[r][c]!==0) fixed[r][c]=true; renderBoard(current) }

    generateBtn.addEventListener('click', ()=>{
      const diff = difficultySel.value
      msg.textContent = 'Generating...'
      // Allow UI to update
      setTimeout(()=>{
        const puzzle = generatePuzzle(diff)
        setPuzzle(puzzle)
        msg.textContent = `Generated ${diff} puzzle — cells to fill: ${countEmpty(puzzle)}`
      }, 10)
    })

    solveBtn.addEventListener('click', ()=>{
      msg.textContent = 'Solving...'
      setTimeout(()=>{
        const sol = solve(current)
        if(!sol){ msg.textContent = 'No solution found for current board.'; return }
        current = sol; renderBoard(current); msg.textContent = 'Solved — here is one valid solution.'
      }, 10)
    })

    checkBtn.addEventListener('click', ()=>{
      const invalid = findConflicts(current)
      if(invalid.length===0) msg.textContent = 'No conflicts detected in your current entries.'
      else msg.textContent = `Found ${invalid.length} conflict(s). Check highlighted cells.`
      // briefly highlight conflicts
      highlightConflicts(invalid)
    })

    clearBtn.addEventListener('click', ()=>{ current = emptyBoard(); fixed = Array.from({length:9},()=>Array(9).fill(false)); renderBoard(current); msg.textContent='Cleared board.' })

    function countEmpty(b){let n=0; for(let r=0;r<9;r++) for(let c=0;c<9;c++) if(b[r][c]===0) n++; return n}

    function findConflicts(board){ const conflicts = []
      for(let r=0;r<9;r++) for(let c=0;c<9;c++){ const v = board[r][c]; if(v===0) continue
        // check row
        for(let cc=0;cc<9;cc++) if(cc!==c && board[r][cc]===v) conflicts.push([r,c])
        // column
        for(let rr=0;rr<9;rr++) if(rr!==r && board[rr][c]===v) conflicts.push([r,c])
        // block
        const br=Math.floor(r/3)*3, bc=Math.floor(c/3)*3
        for(let i=0;i<3;i++) for(let j=0;j<3;j++){ const rr=br+i, cc=bc+j; if((rr!==r||cc!==c) && board[rr][cc]===v) conflicts.push([r,c]) }
      }
      // dedupe by key
      const set = new Set(conflicts.map(k=>k.join(',')))
      return Array.from(set).map(s=>s.split(',').map(Number))
    }

    function highlightConflicts(list){ // list of [r,c]
      // clear any previous
      for(let i=0;i<81;i++){ boardEl.children[i].style.outline=''; }
      list.forEach(([r,c])=>{ const idx=r*9+c; boardEl.children[idx].style.outline='2px solid rgba(255,80,80,0.9)' })
      if(list.length>0) setTimeout(()=>{ list.forEach(([r,c])=>{ const idx=r*9+c; boardEl.children[idx].style.outline=''; }) }, 1800)
    }

    // On load: render empty board
    renderBoard(current)
    msg.textContent = 'Ready — click Generate to start.'

    // Allow pasting or loading a sample puzzle by URL hash (optional)
    window.getBoardValue = ()=>cloneBoard(current)

  })();
