set ts=4
set sw=4

if &compatible
  set nocompatible               " Be iMproved
endif
" Required:
set runtimepath+=/home/goatwizard/.cache/dein/repos/github.com/Shougo/dein.vim
" Required:
if dein#load_state('/home/goatwizard/.cache/dein')
  call dein#begin('/home/goatwizard/.cache/dein')
  " Let dein manage dein
  " Required:
  call dein#add('/home/goatwizard/.cache/dein/repos/github.com/Shougo/dein.vim')
  " Add or remove your plugins here:
  call dein#add('Shougo/neosnippet.vim')
  call dein#add('Shougo/neosnippet-snippets')
  call dein#add('octol/vim-cpp-enhanced-highlight')
  " You can specify revision/branch/tag.
  call dein#add('Shougo/deol.nvim', { 'rev': '01203d4c9' })
  " Required:
  call dein#end()
  call dein#save_state()
endif
" Required:
filetype plugin indent on
syntax enable
" If you want to install not installed plugins on startup.
if dein#check_install()
  call dein#install()
endif
