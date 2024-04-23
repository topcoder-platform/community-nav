import React, { useState, useMemo, useEffect, useLayoutEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import cn from 'classnames'
import _ from 'lodash'
import { config } from 'topcoder-react-utils'

import styles from './index.module.scss'

import MobileNav from './MobileNav'
import MobileSubNav from './MobileSubNav'
import MobileMenu from './MobileMenu'
import PrimaryNav from './PrimaryNav'
import SubNav from './SubNav'

const moreId = 'more'

let id = 1
let idForSecondary = 1000

/* 
  This function returns the menu link based on a couple of conditions:
  1.  If the link ID is myprofile, we fill in the user's handle at the end of the URL, if available
  2.  If the user has a wipro.com email address, we send them to the wipro_href instead (PROD-257)
*/
const getMenuLink= (menuItem, profileHandle, isWipro) => {
  if(isWipro && menuItem.wipro_href){
    return menuItem.wipro_href
  }
  else if(menuItem.id == 'myprofile'){
    if (profileHandle){
      return `/members/${profileHandle}`
    }
    else{
      return '/'
    }
  }
  else{
    return (menuItem.href || '#')
  }
}

const initMenuId = (menu, profileHandle, loggedIn, isWipro) => {
  id = 1
  menu = menu
    .map(level1 => ({
      ...level1,
      id: level1.id || id++,
      subMenu: level1.subMenu && level1.subMenu.map(level2 => ({
        ...level2,
        id: level2.id || id++,
        subMenu: level2.subMenu && level2.subMenu.map(level3 => ({
          ...level3,
          id: level3.id || id++
        }))
      })),
      secondaryMenu: ((loggedIn && profileHandle) ? _.filter(level1.secondaryMenu, item => item && item.logged) : _.filter(level1.secondaryMenu, item => item && !item.logged))
    }))
  menu = menu
    .map(level1 => ({
      ...level1,
      secondaryMenu: level1.secondaryMenu && level1.secondaryMenu.map(levelsec => ({
        ...levelsec,
        id: levelsec.id || idForSecondary++,
        href: getMenuLink(levelsec, profileHandle, isWipro)
      }))
    }))

  let cacheMenu = JSON.parse(window.localStorage.getItem('__top_nav_bar_state'))
  if (cacheMenu && cacheMenu.date + 32000 > (new Date()).getTime()) {
    let menuItem = _.find(menu, (m) => {
      return m.id === cacheMenu.id
    })
    if (menuItem) {
      menuItem.subMenu = cacheMenu.subMenu
    }
  }

  return menu
}

/**
 * TopNav is the main navigation component.
 */
const TopNav = ({
  menu: _menu,
  rightMenu,
  logo,
  theme,
  currentLevel1Id,
  onChangeLevel1Id,
  path,
  setOpenMore,
  openMore,
  loggedIn,
  profileHandle,
  isWipro,
  logoLink
}) => {
  useEffect(() => {
    const orientationchange = () => {
      setOpenMore(false)
      setShowLeftMenu(false)
    }
    window.addEventListener('orientationchange', orientationchange)
    return () => window.removeEventListener('orientationchange', orientationchange)
  }, [])
  const [cache] = useState({
    refs: {},
    slide: {}
  })
  const [collapsed, setCollapsed] = useState(false)
  const [activeLevel1Id, setActiveLevel1Id] = useState()
  const [activeLevel2Id, setActiveLevel2Id] = useState()
  const [activeLevel3Id, setActiveLevel3Id] = useState()
  const [level3Exact, setLevel3Exact] = useState(false)
  const [isResize, setResize] = useState(false)
  const [showLevel3, setShowLevel3] = useState(false)
  const [forceHideLevel3, setforceHideLevel3] = useState(false)
  const [searchOpened, setSearchOpened] = useState(false)

  const [showChosenArrow, setShowChosenArrow] = useState()
  const [chosenArrowX, setChosenArrowX] = useState()
  const [chosenArrowTick, setChosenArrowTick] = useState(0)

  const [showIconSelect, setShowIconSelect] = useState()
  const [iconSelectX, setIconSelectX] = useState()

  const menuWithId = useMemo(() => initMenuId(_menu, profileHandle, loggedIn, isWipro), [_menu, profileHandle, loggedIn, isWipro])

  const [leftNav, setLeftNav] = useState(menuWithId)

  const [showLeftMenu, setShowLeftMenu] = useState()
  const [showMobileSubMenu, setShowMobileSubMenu] = useState()

  const [moreMenu, setMoreMenu] = useState()

  const regenerateMoreMenu = () => setMoreMenu([])

  const createSetRef = id => el => {
    cache.refs[id] = el
  }

  const findLevel1Menu = level1Id => leftNav.find(level1 => level1.id === level1Id)

  const findLevel2Menu = (level1Id, level2Id) => {
    const menu1 = findLevel1Menu(level1Id)
    return menu1 && menu1.subMenu && menu1.subMenu.find(level2 => level2.id === level2Id)
  }

  // if click level2 menu from 'more', exchange to the first place
  const reArrangeLevel2Menu = (level1Id, menuId) => {
    var menu1 = findLevel1Menu(level1Id)
    if (menu1 && menu1.subMenu) {
      let subMenu = menu1.subMenu
      let pos = _.findIndex(subMenu, (level2) => {
        return level2.id === menuId
      })
      let t = subMenu[0]
      subMenu[0] = subMenu[pos]
      subMenu[pos] = t

      pos = _.findIndex(moreMenu, (level2) => {
        return level2.id === menuId
      })
      moreMenu[pos] = t
      window.localStorage.setItem('__top_nav_bar_state', JSON.stringify(_.assign({}, menu1)))
      setMoreMenu([...moreMenu])
      setChosenArrowPos(menuId)
    }
  }
  const activeMenu1 = findLevel1Menu(activeLevel1Id)
  const activeMenu2 = findLevel2Menu(activeLevel1Id, activeLevel2Id)

  const startSlide = useCallback(() => {
    setLeftNav(leftNav => leftNav.map(menu => {
      if (!cache.refs[menu.id]) return menu
      cache.slide[menu.id] = true
      const el = cache.refs[menu.id]
      if (!el) return menu
      const rect = el.getBoundingClientRect()
      return {
        ...menu,
        initialX: rect.x || rect.left
      }
    }))
  }, [cache.refs, cache.slide])

  const getMenuCenter = useCallback(menuId => {
    const el = cache.refs[menuId]
    if (!el) return
    const rect = el.getBoundingClientRect()
    return (rect.x || rect.left) + rect.width / 2
  }, [cache.refs])

  const setChosenArrowPos = useCallback(menuId => {
    setChosenArrowX(getMenuCenter(menuId))
  }, [setChosenArrowX, getMenuCenter])

  const setIconSelectPos = menuId => {
    // wait for menuId element to get positioned in its place
    setTimeout(() => {
      setIconSelectX(getMenuCenter(menuId))
    }, 0)
  }

  const handleClickLogo = (e) => {
    e.preventDefault()
    if (logoLink) {
      window.location = logoLink
    } else {
      window.location = loggedIn ? config.URL.HOME : config.URL.BASE
    }
  }

  const expandMenu = (menuId, menu2Id) => {
    if (!menuId) return
    createHandleClickLevel1(menuId, false)()
    setTimeout(() => {
      if (menu2Id) createHandleClickLevel2(menu2Id, false)()
    }, 0)
  }

  const createHandleClickLevel1 = useCallback((menuId, isClick) => () => {
    if (!menuId) return
    setOpenMore(false)
    setCollapsed(false)
    setActiveLevel1Id(menuId)
    onChangeLevel1Id(menuId)
    setActiveLevel2Id()
    // isClick means that its clicked by user. !isClick is when we click programmatically
    setShowLevel3(true)
    if (isClick) setforceHideLevel3(false)
    startSlide()
    setTimeout(() => {
      // wait for sliding to end before showing arrow for the first time
      setShowChosenArrow(true)
    }, collapsed ? 250 : 0)
    // trigger the execution of useLayoutEffect below, this is necessary because
    // the other dependencies don't change
    setChosenArrowTick(x => x + 1)
  }, [collapsed, onChangeLevel1Id, startSlide])

  useEffect(() => {
    if (currentLevel1Id !== activeLevel1Id) {
      !collapsed && currentLevel1Id && createHandleClickLevel1(currentLevel1Id, false)()
    }
  }, [currentLevel1Id, activeLevel1Id, createHandleClickLevel1])

  useLayoutEffect(() => {
    // get final menu pos before it slide. Do this before sliding start, or
    // we'll get incorrect pos
    activeLevel1Id && setChosenArrowPos(activeLevel1Id)
  }, [activeLevel1Id, setChosenArrowPos, chosenArrowTick, showLeftMenu])

  const createHandleClickLevel2 = (menuId, isClick) => () => {
    setOpenMore(false)
    setActiveLevel2Id(menuId)
    setShowLevel3(true)
    if (isClick) setforceHideLevel3(false)
    setChosenArrowPos(menuId)
  }

  useEffect(() => {
    // update level3 select icon, show it only if current menu is as same as menu address in url
    const { m1, m2, m3 } = getMenuIdsFromPath(menuWithId, path)
    if (m3) {
      // show level 3 icon if active menu menuLevel2 is as same as url
      // or if level2 menu (in both menu and url) is null, and active menu level1 is as same as url
      if (m2 === activeLevel2Id || (!m2 && !activeLevel2Id && (m1 === activeLevel1Id))) {
        setActiveLevel3Id(m3)
        setIconSelectPos(m3)
        setShowIconSelect(true)
      } else {
        setShowIconSelect(false)
      }
    }
  }, [activeLevel1Id, activeLevel2Id, path])

  const createHandleClickLevel3 = menuId => () => {
    setActiveLevel3Id(menuId)
    setIconSelectPos(menuId)

    let cacheMenu = JSON.parse(window.localStorage.getItem('__top_nav_bar_state'))
    if (cacheMenu) {
      window.localStorage.setItem('__top_nav_bar_state', JSON.stringify(_.assign({}, cacheMenu, { date: (new Date().getTime()) })))
    }
  }

  const handleClickMore = () => setOpenMore(x => !x)

  const handleCloseMore = () => setOpenMore(false)

  const handleSearchPanel = (x) => {
    setSearchOpened(x)
    cache.refs.searchInputBox.value = ''
  }

  const createHandleClickMoreItem = menuId => () => {
    setOpenMore(false)
    setActiveLevel2Id(menuId)
    setShowLevel3(true)
    setforceHideLevel3(false)
    // let the level 3 menu mounted first for sliding indicator to work
    setTimeout(() => {
      reArrangeLevel2Menu(activeLevel1Id, menuId)
    })
  }

  const handleClickLeftMenu = () => setShowLeftMenu(x => !x)

  const createHandleClickLevel2Mobile = menuId => () => {
    setShowLeftMenu(false)
    setActiveLevel2Id(menuId)
  }

  const createHandleClickLevel3Mobile = menuId => () => {
    setActiveLevel3Id(menuId)
    setShowMobileSubMenu(false)
  }

  const handleClickSubMenu = () => setShowMobileSubMenu(x => !x)

  const setOverflow = useCallback(set => {
    cache.refs.primaryNav.style.overflow = set ? 'hidden' : ''
    const containers = Object.keys(cache.refs)
      .filter(key => key.startsWith('level2Container'))
      .map(key => cache.refs[key])
    containers.forEach(el => {
      el.style.overflow = set ? 'hidden' : ''
    })
  }, [cache.refs])

  useEffect(() => {
    const doSlide = () => {
      leftNav.forEach(menu => {
        if (!cache.slide[menu.id] || !cache.refs[menu.id]) return
        cache.slide[menu.id] = false
        const el = cache.refs[menu.id]
        if (!el) return
        const rect = el.getBoundingClientRect()
        const relativeX = menu.initialX - (rect.x || rect.left)
        el.style.transform = `translateX(${relativeX}px)`
        setTimeout(() => {
          el.style.transition = 'transform 250ms ease-out'
          el.style.transform = `translateX(0px)`
          setTimeout(() => {
            el.style.transition = ''
            el.style.transform = ''
          }, 250)
        })
      })
    }
    // set overflow first to have correct final position
    setOverflow(true)
    doSlide()
    // overflow must not be set, otherwise popups won't show
    setOverflow(false)
  }, [cache.slide, cache.refs, leftNav, setOverflow])

  const handleRightMenuResize = () => {
    regenerateMoreMenu()
  }

  // trigger more menu generation on level 1 item change
  useEffect(() => {
    setMoreMenu([])
  }, [activeMenu1])

  // show/hide level 2 more menu
  const generateMoreMenu = useCallback(() => {
    // only proceed if more menu is empty
    if (moreMenu && moreMenu.length) return
    if (!activeMenu1 || !activeMenu1.subMenu) return
    const generateMenu = () => {
      const newMoreMenu = []
      let prect
      for (let i = activeMenu1.subMenu.length - 1; i >= 0; i--) {
        const menu = activeMenu1.subMenu[i]
        const menuEl = cache.refs[menu.id]
        if (!menuEl) return
        const rect = menuEl.getBoundingClientRect()
        if (!prect) {
          if (!menuEl.parentElement) return
          prect = menuEl.parentElement.getBoundingClientRect()
        }
        // add the item if it's overflowing
        if (rect.right > prect.right && rect.right - prect.right > 1) {
          newMoreMenu.unshift(menu)
        } else if (newMoreMenu.length && prect.right - rect.right < 100) {
          // make sure we have space for the 'more' menu
          newMoreMenu.unshift(menu)
        } else {
          break
        }
      }
      if (newMoreMenu.length) {
        setMoreMenu(newMoreMenu)
      } else {
        window.localStorage.removeItem('__top_nav_bar_state')
      }
    }
    setOverflow(true)
    generateMenu()
    setOverflow(false)
  }, [activeMenu1, cache.refs, moreMenu, setOverflow])

  // generate more menu before paint
  useLayoutEffect(() => {
    generateMoreMenu()
  }, [generateMoreMenu])

  useEffect(() => {
    // trigger more menu generation on resize
    const onResize = _.debounce(() => {
      regenerateMoreMenu([])
      // tick to update menu (reposition arrow)
      // setChosenArrowTick(x => x + 1)
    }, 100)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const getMenuIdsFromPath = (menuWithId_, path_) => {
    let found = { m1: null, m2: null, m3: null }

    // If haven't a path just return
    if (!path_) return found

    menuWithId_.forEach(level1 => {
      if (level1.href && path_.indexOf(level1.href) > -1) found = { m1: level1.id, m2: null }
      level1.subMenu && level1.subMenu.forEach(level2 => {
        if (level2.href && path_.indexOf(level2.href) > -1) found = { m1: level1.id, m2: level2.id }
        level2.subMenu && level2.subMenu.forEach(level3 => {
          if (level3.href && path_.indexOf(level3.href) > -1) {
            if (level3.href && level3.href === path_) {
              found = { m1: level1.id, m2: level2.id, m3: level3.id }
              setLevel3Exact(true)
            } else if (!found.m3) {
              found = { m1: level1.id, m2: level2.id, m3: level3.id }
            }
            if (!activeLevel3Id && level3.collapsed) setforceHideLevel3(true)
          }
        })
      })
      level1.secondaryMenu && level1.secondaryMenu.forEach(level3 => {
        if (level3.href && level3.href === path_) {
          found = { m1: level1.id, m3: level3.id }
        }
      })
    })
    return found
  }

  let timeId = 0
  useEffect(() => {
    // when scren change size, keep green indicator keep static
    const onResize = _.debounce(() => {
      if (timeId) { clearTimeout(timeId) }
      const { m3 } = getMenuIdsFromPath(menuWithId, path)
      activeLevel2Id && setChosenArrowPos(activeLevel2Id)
      setIconSelectPos(m3)
      setResize(true)
      timeId = setTimeout(() => {
        setResize(false)
        timeId = 0
      }, 1000)
    }, 50)

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [getMenuIdsFromPath])

  useEffect(() => {
    if (!path || !menuWithId[0]) return
    setLeftNav(menuWithId)
    // always expand menu on challenge list page and challenge details page
    // also in challenge details page, level 3 menu shouldnt be visible    if (!path || !menuWithId[0]) return
    const { m1, m2 } = getMenuIdsFromPath(menuWithId, path)
    let forceM2 = null

    if (path.indexOf('/challenges') > -1) {
      // If All Challenge page
      if (path.match(/challenges\/[\w]{8}-[\w]{4}-[\w]{4}-[\w]{4}-[\w]{12}|\d{5,8}/)) {
        // If Challenge Details page
        setforceHideLevel3(true)
        forceM2 = getMenuIdsFromPath(menuWithId, path).m2
      }
    } else if (path.indexOf('/home') > -1 || path.indexOf('/members/' + profileHandle) > -1) {
      // If My Dashboard and My Profile page
      setShowLevel3(true)
    } else if (path.indexOf('/community/learn') > -1 || path.indexOf('/thrive/tracks') > -1) {
      // Show 3rd level menu to Community [ Overview - How It Works ]
      forceM2 = getMenuIdsFromPath(menuWithId, '/community').m2
    } else if (!m2) {
      setShowLevel3(false)
      setforceHideLevel3(true)
    }

    // expand first Level1Menu(like work/business) on login / logout.
    setTimeout(() => {
      expandMenu(m1 || 'community', m2 || forceM2)
    })
  }, [path, loggedIn, profileHandle])

  return (
    <div className={cn(styles.themeWrapper, `theme-${theme}`)}>
      <div className={styles.headerNavUi}>

        {/* The top mobile navigation */}
        <MobileNav
          showLeftMenu={showLeftMenu}
          logo={logo}
          onClickLogo={handleClickLogo}
          rightMenu={rightMenu}
          onClickLeftMenu={handleClickLeftMenu}
        />

        {/* Mobile sub navigation (active level 2 menu) */}
        {!showLeftMenu && (activeMenu2 || activeMenu1) && (
          <MobileSubNav
            open={showMobileSubMenu}
            menu={activeMenu2 || activeMenu1}
            isSecondaryMenu={!activeMenu2}
            activeChildId={activeLevel3Id}
            onClick={handleClickSubMenu}
            createHandleClickItem={createHandleClickLevel3Mobile}
          />
        )}

        {/* Primary navigation (level 1 and level 2 menu) */}
        <PrimaryNav
          collapsed={collapsed}
          showLeftMenu={showLeftMenu}
          logo={logo}
          menu={leftNav}
          rightMenu={rightMenu}
          moreMenu={moreMenu}
          openMore={openMore}
          onCloseMore={handleCloseMore}
          moreId={moreId}
          activeLevel1Id={activeLevel1Id}
          activeLevel2Id={activeLevel2Id}
          onClickLogo={handleClickLogo}
          onRightMenuResize={handleRightMenuResize}
          createHandleClickLevel1={createHandleClickLevel1}
          createHandleClickLevel2={createHandleClickLevel2}
          handleClickMore={handleClickMore}
          createHandleClickMoreItem={createHandleClickMoreItem}
          createSetRef={createSetRef}
          showChosenArrow={showChosenArrow}
          showLevel3={showLevel3}
          forceHideLevel3={forceHideLevel3}
          chosenArrowX={chosenArrowX}
          searchOpened={searchOpened}
          toggleSearchOpen={handleSearchPanel}
        />

        {/* Level 3 menu */}
        {((activeMenu2 && activeMenu2.subMenu && activeMenu2.subMenu.length > 0) ||
          (!activeMenu2 && activeMenu1 && activeMenu1.secondaryMenu && activeMenu1.secondaryMenu.length > 0)) &&
          <SubNav
            open={forceHideLevel3 ? false : showLevel3}
            menu={activeMenu2 || activeMenu1}
            isResize={isResize}
            isSecondaryMenu={!activeMenu2}
            activeChildId={activeLevel3Id}
            exact={level3Exact}
            showIndicator={showIconSelect}
            indicatorX={iconSelectX}
            createHandleClickItem={createHandleClickLevel3}
            createSetRef={createSetRef}
          />
        }

        {/* Mobile level 2 menu */}
        {showLeftMenu && activeMenu1 && (
          <MobileMenu
            menu={activeMenu1}
            activeChildId={activeLevel2Id}
            createHandleClickItem={createHandleClickLevel2Mobile}
          />
        )}

      </div>
    </div>
  )
}

TopNav.defaultProps = {
  theme: 'light',
  onChangeLevel1Id: () => null
}

TopNav.propTypes = {
  /**
   * Array of menu objects, each with properties:
   *
   *   - title {string|element} The title
   *   - href {string} The href for wrapper anchor
   *   - subMenu {array} Children menu
   */
  menu: PropTypes.array.isRequired,

  rightMenu: PropTypes.node,

  logo: PropTypes.node,

  /** light|dark etc */
  theme: PropTypes.string,

  currentLevel1Id: PropTypes.any,

  onChangeLevel1Id: PropTypes.func,

  path: PropTypes.string,

  setOpenMore: PropTypes.func,

  openMore: PropTypes.bool,

  loggedIn: PropTypes.bool,

  profileHandle: PropTypes.string,

  logoLink: PropTypes.string,

  isWipro: PropTypes.bool
}

export default TopNav
