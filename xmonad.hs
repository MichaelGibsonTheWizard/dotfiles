import XMonad
import XMonad.Hooks.DynamicLog
import XMonad.Hooks.ManageDocks
import XMonad.Hooks.ManageHelpers
import XMonad.Hooks.EwmhDesktops
import XMonad.Util.Run(spawnPipe)
import XMonad.Util.EZConfig(additionalKeys)
import System.IO
import XMonad.Layout.Spacing
import Graphics.X11.Xlib
import Graphics.X11.Xlib.Extras
import Data.Monoid
import Data.Word
import XMonad.Hooks.FadeWindows
import XMonad.Layout.NoBorders
import XMonad.Layout.Reflect

--setTransparentHook :: Event -> X All
--setTransparentHook ConfigureEvent{ev_event_type = createNotify, ev_window = id} = do
--    setOpacity id opacity
--    return (All True) where
--        opacityFloat = 0.9
--        opacity = floor $ fromIntegral (maxBound :: Word32) * opacityFloat
--        setOpacity id op = spawn $ "xprop -id " ++ show id ++ " -f _NET_WM_WINDOW_OPACITY 32c -set _NET_WM_WINDOW_OPACITY " ++ show op


--setTransparentHook _ = return (All True)

myFadeHook = composeAll [ opaque
                        , className =? "Alacritty" --> transparency 0.1
                        ]

main = do
    xmproc <- spawnPipe "/usr/bin/xmobar /home/goatwizard/.xmobarrc"
    xmonad $ def
        { logHook            = fadeWindowsLogHook myFadeHook <+>
                               dynamicLogWithPP xmobarPP
                               { ppOutput = hPutStrLn xmproc
                               , ppTitle = xmobarColor "blue" "" . shorten 50
                               }
        , manageHook         = composeAll [ manageDocks
                                          , isFullscreen --> doFullFloat
                                          , manageHook def
                                          ]
        , layoutHook         = avoidStruts $ spacingRaw True (Border 10 10 10 10) True (Border 10 10 10 10) True $ layoutHook def
        , handleEventHook    = fadeWindowsEventHook <+> handleEventHook def <+> fullscreenEventHook <+> docksEventHook
        , terminal           = "alacritty"
        , normalBorderColor  = "#34CADF"
        , focusedBorderColor = "#FF69A0" 
        , modMask            = mod4Mask 
        , borderWidth        = 0
        } `additionalKeys`
        [ ((controlMask, xK_Print), spawn "sleep 0.2; scrot -s")
        , ((0, xK_Print), spawn "scrot") 
        , ((mod4Mask .|. shiftMask, xK_t), spawn "firefox")
        ]
