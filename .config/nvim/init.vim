if exists('g:GtkGuiLoaded')
	call rpcnotify(1, 'Gui', 'Font', 'Hasklug Nerd Font 14')
endif

set ts=4
set sw=4
set expandtab
set number
set relativenumber
set clipboard=unnamedplus
set encoding=utf-8
:tnoremap <Esc> <C-\><C-n>

let g:vimtex_compiler_progname = 'nvr'
let g:vimtex_view_method = 'zathura'

call plug#begin('~/.local/share/nvim/plugged')

Plug 'lervag/vimtex'

call plug#end()
