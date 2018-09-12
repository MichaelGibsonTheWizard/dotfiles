xrdb -merge .Xresources

trayer --edge top --align right --SetDockType true --SetPartialStrut true \
 --expand true --width 10 --transparent true --tint 0x191970 --height 12 &

feh --bg-scale /home/goatwizard/bkgrd.jpg

compton --config /home/goatwizard/.config/compton.conf -b
exec xmonad
