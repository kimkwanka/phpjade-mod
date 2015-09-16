# phpjade-mod

The modifier module for Jade template engine.  
This project is a modification of ['phpjade'](https://github.com/kurohara/phpjade) which itself is based on ['jade-php'](https://github.com/viniwrubleski/jade-php).

It was created for my own needs and features the following differences to ['phpjade'](https://github.com/kurohara/phpjade):

1.  The ```-``` token has the default behaviour again which means you can use it for 
jade conditionals, etc again. Check the jade documentation for details.

2. The ```:php``` filter was improved so that it can be used to output single-line php in addition to complete php blocks. 
This allows you to use ```:php``` instead of ```-``` which is neccessary since the original behaviour of ```-``` was restored.

The rest of ['phpjade'](https://github.com/kurohara/phpjade)'s API modifications are still in place, so for more details on those
check ['phpjade's documentation](https://github.com/kurohara/phpjade).

## Modified examples to showcase slightly changed usage
### Example - 1

```
html
  body
    :php testfunc();
    div(__=some_php_function())
      | test
    :php foreach ($this->list as $list):
      li!= $list
    :php endforeach

```

```html
<html>
  <body>
    <?php testfunc(); ?>
    <div <?php some_php_function(); ?> >test</div>
    <?php foreach ($this->list as $list): ?>
      <li><?php echo $list; ?></li>
    <?php endforeach; ?>
  </body>
</html>
```

### Example - 2(using prefunction option)

* passing prefunction and data

```javascript
var jade = require('jade');
var phpjade = require('phpjade');
phpjade.init(jade);
var fn = jade.compileFile(filepath,
  {
        usestrip: true,
        pretty: true,
        prefunction: function(input/*, options*/) {
          return input.replace(/\$\$+/, "#{data.domain}");
        },
  }
);
var php = fn({data: { domain: "mytextdomain" } });
```

* Jade source

```
:php
  /**
   * @package WordPress
   * @subpackage $$
   */
html
  body
    div!=_e('This is my opinion', '$$')
    div=_test("$$")
    div
      :php _test("$$")
    div(op=_test("$$"))
    div(op!=_test("$$"))
    div(op=$test)
    div(op!=$test)
    div(op="#{data.domain}")
    div(op="$$")
    div(op!=php_func('abc', "def", "ghi" + '$$')+"ghijk")

```
* produced php  

```
<?php
/**
 * @package WordPress
 * @subpackage mytextdomain
 */
?>
<html>
  <body>
    <div>
      <?php echo _e('This is my opinion', 'mytextdomain'); ?></div>
    <div>
      <?php echo htmlspecialchars(_test("mytextdomain"), ENT_QUOTES, 'UTF-8'); ?></div>
    <div>
      <?php _test("mytextdomain"); ?>
    </div>
    <div op="<?php echo htmlspecialchars(_test("mytextdomain"), ENT_QUOTES, 'UTF-8'); ?>"></div>
    <div op="<?php echo _test("mytextdomain"); ?>"></div>
    <div op="<?php echo htmlspecialchars($test, ENT_QUOTES, 'UTF-8'); ?>"></div>
    <div op="<?php echo $test; ?>"></div>
    <div op="mytextdomain"></div>
    <div op="mytextdomain"></div>
    <div op="<?php echo php_func('abc', "def", "ghi" + 'mytextdomain'); ?>ghijk"> </div>
  </body>
</html>
```

## License
Licensed under MIT license.

## Related projects
* ['phpjade'](https://github.com/kurohara/phpjade)
Original phpjade by Hiroyoshi Kurohara.
