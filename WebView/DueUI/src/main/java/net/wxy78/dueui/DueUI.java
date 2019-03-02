package net.wxy78.dueui;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.SharedPreferences;
import android.preference.PreferenceManager;
import android.support.v7.app.ActionBar;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.os.Handler;
import android.view.MotionEvent;
import android.view.View;
import android.view.inputmethod.InputMethodManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Switch;

/**
 * An example full-screen activity that shows and hides the system UI (i.e.
 * status bar and navigation/system bar) with user interaction.
 */
public class DueUI extends AppCompatActivity implements View.OnClickListener {
    private static final int UI_ANIMATION_DELAY = 300;
    private final Handler mHideHandler = new Handler();
    private View mUrlView;
    private WebView mWebView;
    private EditText mDueUIURL;
    private Switch mShowAtStartup;
    private Button mGoButton;
    SharedPreferences sharedPref;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        sharedPref = PreferenceManager.getDefaultSharedPreferences(this);
        String url = sharedPref.getString("preference_url", "");
        Boolean show_at_startup = sharedPref.getBoolean("preference_show_at_startup", true);
        Boolean already_run = sharedPref.getBoolean("preference_already_run", false);

        setContentView(R.layout.activity_fullscreen);

        mWebView = findViewById(R.id.webview);
        mUrlView = findViewById(R.id.urlView);
        mDueUIURL = findViewById(R.id.dueuiURL);
        mShowAtStartup = findViewById(R.id.show_at_startup);
        mGoButton = findViewById(R.id.goButton);

        if (show_at_startup || !already_run) {
            mDueUIURL.setText(url);
            mShowAtStartup.setChecked(show_at_startup);
            mUrlView.setVisibility(View.VISIBLE);
            mWebView.setVisibility(View.GONE);
        } else {
            showWebView(url);
        }

        mUrlView.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LOW_PROFILE
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION);

        ActionBar actionBar = getSupportActionBar();
        if (actionBar != null) {
            actionBar.hide();
        }

        mGoButton.setOnClickListener(this);

    }

    @Override
    protected void onPostCreate(Bundle savedInstanceState) {
        super.onPostCreate(savedInstanceState);
    }

    public void onClick(View v) {
        String url = mDueUIURL.getText().toString();
        Boolean show_at_startup = mShowAtStartup.isChecked();

        View view = this.getCurrentFocus();
        if (view != null) {
            InputMethodManager imm = (InputMethodManager)getSystemService(Context.INPUT_METHOD_SERVICE);
            imm.hideSoftInputFromWindow(view.getWindowToken(), 0);
        }

        SharedPreferences.Editor editor = sharedPref.edit();
        editor.putString("preference_url", url);
        editor.putBoolean("preference_show_at_startup", show_at_startup);
        editor.putBoolean("preference_already_run", true);
        editor.commit();

        showWebView(url);
    }

    public void showWebView(String url) {
        mUrlView.setVisibility(View.GONE);
        mWebView.setVisibility(View.VISIBLE);
        mWebView.setWebViewClient(new DueUIWebView());
        mWebView.getSettings().setJavaScriptEnabled(true);
        mWebView.getSettings().setLoadsImagesAutomatically(true);
        mWebView.loadUrl(url);
    }

    private class DueUIWebView extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            view.loadUrl(url);
            return true;
        }
    }
}
