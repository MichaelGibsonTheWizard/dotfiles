set relativenumber						" Line numbers
set hidden						" Allow hidden buffers
filetype plugin indent on		" Enable file type detection and do language-dependent indenting.
set history=100					" Default = 8
set tabstop=4					" Default tabs are too big
set wrap						" Turn on word wrapping
set linebreak					" Only wrap at sensible places
set nolist						" list disables linebreak
set textwidth=160					" prevent Vim from automatically inserting line breaks
set wrapmargin=0
set formatoptions-=t			" Don't change wrapping on existing lines
set formatoptions+=l			" Black magic

" # Install Plugins
call plug#begin('~/.vim/plugged')
	Plug 'nelstrom/vim-markdown-folding'
	Plug 'tpope/vim-markdown'
	Plug 'https://github.com/sirtaj/vim-openscad'	" OpenSCAD syntax hilighting
	Plug 'scrooloose/syntastic'						" syntax info
	Plug 'Raimondi/delimitmate'						" smart completion of delimiters
call plug#end()

" # Plugin Settings
set foldenable			" Enable markdown folding
" Remove existing autocommands to avoid duplicates
:autocmd!
:autocmd VimEnter * PlugUpdate
